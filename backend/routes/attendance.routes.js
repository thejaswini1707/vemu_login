const express = require('express');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

function buildQuery(q) {
  const query = {};

  if (q.studentId && mongoose.Types.ObjectId.isValid(q.studentId)) query.student = q.studentId;
  if (q.date) query.date = q.date;
  if (q.branch && q.branch !== 'all') query.branch = q.branch;
  if (q.year && q.year !== 'all') query.year = q.year;
  if (q.section && q.section !== 'all') query.section = q.section;
  if (q.status && q.status !== 'all') query.status = q.status;

  return query;
}

router.get('/', async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const records = await Attendance.find(query).sort({ date: -1, updatedAt: -1 });

    return res.json({ records });
  } catch (error) {
    console.error('FETCH ATTENDANCE ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const query = buildQuery(req.query);

    const [total, present, absent] = await Promise.all([
      Attendance.countDocuments(query),
      Attendance.countDocuments({ ...query, status: 'present' }),
      Attendance.countDocuments({ ...query, status: 'absent' })
    ]);

    const percentage = total ? Math.round((present / total) * 100) : 0;

    return res.json({ total, present, absent, percentage });
  } catch (error) {
    console.error('ATTENDANCE SUMMARY ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance summary' });
  }
});

router.post('/mark', async (req, res) => {
  try {
    const { date, records, markedBy } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No attendance records provided' });
    }

    const saved = [];

    for (const item of records) {
      if (!item.studentId || !mongoose.Types.ObjectId.isValid(item.studentId)) {
        continue;
      }

      const student = await User.findById(item.studentId);

      if (!student || student.role !== 'student') {
        continue;
      }

      const status = item.status === 'present' ? 'present' : 'absent';

      const updated = await Attendance.findOneAndUpdate(
        { student: student._id, date },
        {
          student: student._id,
          studentName: student.displayName || student.username,
          rollNumber: student.rollNumber || '',
          branch: student.branch || '',
          year: student.year || '',
          section: student.section || '',
          date,
          status,
          markedBy: markedBy?.id && mongoose.Types.ObjectId.isValid(markedBy.id) ? markedBy.id : null,
          markedByName: markedBy?.username || '',
          markedByRole: markedBy?.role || ''
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      saved.push(updated);
    }

    await AuditLog.create({
      action: 'ATTENDANCE_MARK',
      actorId: markedBy?.id && mongoose.Types.ObjectId.isValid(markedBy.id) ? markedBy.id : null,
      actorName: markedBy?.username || 'system',
      actorRole: markedBy?.role || 'system',
      message: `Attendance saved for ${date}`,
      meta: { count: saved.length }
    });

    return res.json({
      message: `Attendance saved for ${saved.length} students`,
      records: saved
    });
  } catch (error) {
    console.error('MARK ATTENDANCE ERROR:', error);
    return res.status(500).json({ message: 'Failed to save attendance' });
  }
});

module.exports = router;