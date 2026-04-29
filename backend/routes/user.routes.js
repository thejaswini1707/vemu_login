const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

function normalizeRole(role) {
  const value = String(role || '').toLowerCase().trim();

  if (value === 'hod') return 'hod';
  if (value === 'faculty') return 'faculty';
  if (value === 'student') return 'student';
  if (value === 'admin') return 'admin';

  return value;
}

function normalizeStatus(status) {
  return String(status || 'Active').trim() === 'Blocked' ? 'Blocked' : 'Active';
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    role: user.role,
    username: user.username,
    displayName: user.displayName || user.username,
    status: user.status,
    email: user.email || '',
    branch: user.branch || '',
    year: user.year || '',
    section: user.section || '',
    rollNumber: user.rollNumber || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function addLog(action, actor, message, meta = null) {
  await AuditLog.create({
    action,
    actorId: actor?.id || actor?._id || null,
    actorName: actor?.username || actor?.actorName || 'system',
    actorRole: actor?.role || actor?.actorRole || 'system',
    message,
    meta
  });
}

router.get('/', async (req, res) => {
  try {
    const { role, branch, year, section, status, search } = req.query;
    const query = {};

    if (role && role !== 'all') query.role = normalizeRole(role);
    if (branch && branch !== 'all') query.branch = branch;
    if (year && year !== 'all') query.year = year;
    if (section && section !== 'all') query.section = section;
    if (status && status !== 'all') query.status = normalizeStatus(status);

    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { username: { $regex: safe, $options: 'i' } },
        { displayName: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { branch: { $regex: safe, $options: 'i' } },
        { rollNumber: { $regex: safe, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json({ users: users.map(toPublicUser) });
  } catch (error) {
    console.error('FETCH USERS ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, blocked, admins, hods, faculties, students] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'Active' }),
      User.countDocuments({ status: 'Blocked' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'hod' }),
      User.countDocuments({ role: 'faculty' }),
      User.countDocuments({ role: 'student' })
    ]);

    return res.json({
      total,
      active,
      blocked,
      admins,
      hods,
      faculties,
      students
    });
  } catch (error) {
    console.error('USER STATS ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      role,
      username,
      displayName,
      password,
      email,
      branch,
      year,
      section,
      rollNumber,
      actor
    } = req.body;

    const cleanRole = normalizeRole(role);
    const cleanUsername = String(username || '').trim();

    if (!['admin', 'hod', 'faculty', 'student'].includes(cleanRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!cleanUsername || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    if (cleanRole !== 'admin' && !branch) {
      return res.status(400).json({ message: 'Branch is required' });
    }

    if (cleanRole === 'student' && !rollNumber) {
      return res.status(400).json({ message: 'Roll number is required for students' });
    }

    const exists = await User.findOne({
      role: cleanRole,
      username: { $regex: `^${escapeRegex(cleanUsername)}$`, $options: 'i' }
    });

    if (exists) {
      return res.status(409).json({ message: 'Username already exists for this role' });
    }

    if (cleanRole === 'student' && rollNumber) {
      const rollExists = await User.findOne({
        role: 'student',
        rollNumber: { $regex: `^${escapeRegex(rollNumber)}$`, $options: 'i' }
      });

      if (rollExists) {
        return res.status(409).json({ message: 'Roll number already exists' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: cleanRole,
      username: cleanUsername,
      displayName: displayName || cleanUsername,
      passwordHash,
      status: 'Active',
      email: email || '',
      branch: branch || '',
      year: year || '',
      section: section || '',
      rollNumber: rollNumber || ''
    });

    await addLog(
      'USER_CREATE',
      actor,
      `${cleanRole} account created: ${cleanUsername}`,
      { createdUserId: user._id.toString() }
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error('CREATE USER ERROR:', error);

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate user found' });
    }

    return res.status(500).json({ message: 'Failed to create user' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actor } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const cleanStatus = normalizeStatus(status);

    const user = await User.findByIdAndUpdate(
      id,
      { status: cleanStatus },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    await addLog(
      'USER_STATUS_UPDATE',
      actor,
      `${user.username} status changed to ${cleanStatus}`,
      { userId: user._id.toString() }
    );

    return res.json({
      message: 'User status updated successfully',
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error('STATUS UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Failed to update user status' });
  }
});

router.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, actor } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      id,
      { passwordHash },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    await addLog(
      'PASSWORD_RESET',
      actor,
      `Password reset for ${user.role}: ${user.username}`,
      { userId: user._id.toString() }
    );

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorId, actorName, actorRole } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID. Refresh the directory and try again.' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User already removed or not found' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });

      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin account' });
      }
    }

    await Attendance.deleteMany({ student: user._id });
    await User.findByIdAndDelete(id);

    await addLog(
      'USER_DELETE',
      {
        id: actorId || null,
        username: actorName || 'system',
        role: actorRole || 'system'
      },
      `${user.role} deleted: ${user.username}`,
      { deletedUserId: user._id.toString() }
    );

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DELETE USER ERROR:', error);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;