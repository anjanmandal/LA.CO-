import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
  key: String,                 // 'reporting_period', 'capture_volume_tonnes'
  label: String,               // UI label
  type: { type: String, enum: ['string','number','date','select','file','multiline'], default: 'string' },
  required: { type: Boolean, default: false },
  help: String,
  options: [String],           // for select
  pattern: String,             // optional regex string
}, { _id: false });

const FilingTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },       // 'Annual MRV Report'
  description: String,
  fields: [FieldSchema],
  attachments: [{ key: String, label: String, required: Boolean }],
  aiValidationHint: String, // prompt addendum for AI validation/explanations
}, { timestamps: true });

export default mongoose.model('FilingTemplate', FilingTemplateSchema);
