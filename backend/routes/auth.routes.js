const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

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
    rollNumber: user.rollNumber || ''
  };
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().trim();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.post('/login', async (req, res) => {
  try {
    const { role, username, password } = req.body;

    const cleanRole = normalizeRole(role);
    const cleanUsername = String(username || '').trim();

    if (!cleanRole || !cleanUsername || !password) {
      return res.status(400).json({ message: 'Role, username and password are required' });
    }

    if (!['admin', 'hod', 'faculty', 'student'].includes(cleanRole)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    const user = await User.findOne({
      role: cleanRole,
      username: { $regex: `^${escapeRegex(cleanUsername)}$`, $options: 'i' }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or role' });
    }

    if (user.status === 'Blocked') {
      return res.status(403).json({ message: 'This account is blocked. Contact admin.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    await AuditLog.create({
      action: 'LOGIN',
      actorId: user._id,
      actorName: user.username,
      actorRole: user.role,
      message: `${user.role} logged in`
    });

    return res.json({
      message: 'Login successful',
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({ message: 'Login failed. Please check backend terminal.' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_CHANGE',
      actorId: user._id,
      actorName: user.username,
      actorRole: user.role,
      message: `${user.username} changed password`
    });

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('CHANGE PASSWORD ERROR:', error);
    return res.status(500).json({ message: 'Password change failed' });
  }
});

module.exports = router;