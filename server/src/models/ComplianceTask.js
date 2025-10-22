import mongoose from 'mongoose';

const AuditSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  actor: String,        // userId/email/system
  action: String,       // 'created','status_changed','reminder_sent','submitted'
  meta: Object
}, { _id: false });

const ComplianceTaskSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegRequirement', index: true },
  title: String,
  owner: String,             // email/user id
  dueAt: Date,
  status: { type: String, enum: ['open','in_progress','submitted','accepted','overdue','closed','rejected'], default: 'open', index: true },
  priority: { type: String, enum: ['low','med','high'], default: 'med' },
  generatedBy: { type: String, enum: ['engine','manual','seed'], default: 'engine' },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  audit: [AuditSchema]
}, { timestamps: true });

ComplianceTaskSchema.index({ orgId:1, dueAt:1 });

export default mongoose.model('ComplianceTask', ComplianceTaskSchema);
