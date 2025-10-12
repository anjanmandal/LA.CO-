import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FilingTemplate' },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceTask' },
  values: { type: Object, default: {} },       // key -> value
  files: [{ key: String, filename: String, path: String, size: Number, mimetype: String }],
  validation: {
    ok: Boolean,
    messages: [String],
    model: String
  },
  status: { type: String, enum: ['draft','submitted','accepted','rejected'], default: 'draft' }
}, { timestamps: true });

export default mongoose.model('Submission', SubmissionSchema);
