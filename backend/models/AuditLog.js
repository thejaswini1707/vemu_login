const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorName: {
      type: String,
      default: 'system'
    },
    actorRole: {
      type: String,
      default: 'system'
    },
    message: {
      type: String,
      default: ''
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);