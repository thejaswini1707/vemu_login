const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    type: {
      type: String,
      enum: ['General', 'Assignment', 'Holiday', 'Event', 'Exam', 'Notice'],
      default: 'General'
    },
    targetRoles: {
      type: [String],
      default: ['student']
    },
    branch: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdByName: {
      type: String,
      default: ''
    },
    createdByRole: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);