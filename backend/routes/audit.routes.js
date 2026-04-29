const express = require('express');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
    return res.json({ logs });
  } catch (error) {
    console.error('FETCH AUDIT LOGS ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;