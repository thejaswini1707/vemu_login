const express = require('express');
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { role, branch } = req.query;
    const query = {};

    if (role && role !== 'all') {
      query.$or = [
        { targetRoles: role },
        { targetRoles: 'all' }
      ];
    }

    if (branch && branch !== 'all') {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { branch },
            { branch: '' }
          ]
        }
      ];
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    return res.json({ announcements });
  } catch (error) {
    console.error('FETCH ANNOUNCEMENTS ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, type, targetRoles, branch, createdBy } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Announcement title is required' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      description: description || '',
      type: type || 'General',
      targetRoles: Array.isArray(targetRoles) && targetRoles.length ? targetRoles : ['student'],
      branch: branch || '',
      createdBy: createdBy?.id && mongoose.Types.ObjectId.isValid(createdBy.id) ? createdBy.id : null,
      createdByName: createdBy?.username || 'system',
      createdByRole: createdBy?.role || 'system'
    });

    await AuditLog.create({
      action: 'ANNOUNCEMENT_CREATE',
      actorId: createdBy?.id && mongoose.Types.ObjectId.isValid(createdBy.id) ? createdBy.id : null,
      actorName: createdBy?.username || 'system',
      actorRole: createdBy?.role || 'system',
      message: `Announcement posted: ${announcement.title}`,
      meta: { announcementId: announcement._id.toString() }
    });

    return res.status(201).json({
      message: 'Announcement published successfully',
      announcement
    });
  } catch (error) {
    console.error('CREATE ANNOUNCEMENT ERROR:', error);
    return res.status(500).json({ message: 'Failed to publish announcement' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorName, actorRole } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid announcement ID' });
    }

    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await AuditLog.create({
      action: 'ANNOUNCEMENT_DELETE',
      actorName: actorName || 'system',
      actorRole: actorRole || 'system',
      message: `Announcement deleted: ${deleted.title}`
    });

    return res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('DELETE ANNOUNCEMENT ERROR:', error);
    return res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

module.exports = router;