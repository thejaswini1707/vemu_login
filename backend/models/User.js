const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['admin', 'hod', 'faculty', 'student'],
      required: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    displayName: {
      type: String,
      default: '',
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Blocked'],
      default: 'Active'
    },
    email: {
      type: String,
      default: '',
      trim: true
    },
    branch: {
      type: String,
      default: '',
      trim: true
    },
    year: {
      type: String,
      default: '',
      trim: true
    },
    section: {
      type: String,
      default: '',
      trim: true
    },
    rollNumber: {
      type: String,
      default: '',
      trim: true
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, username: 1 }, { unique: true });

module.exports =
  mongoose.models.User || mongoose.model('User', userSchema);