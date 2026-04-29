const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentName: {
      type: String,
      required: true
    },
    rollNumber: {
      type: String,
      default: ''
    },
    branch: {
      type: String,
      default: ''
    },
    year: {
      type: String,
      default: ''
    },
    section: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      required: true
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    markedByName: {
      type: String,
      default: ''
    },
    markedByRole: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);