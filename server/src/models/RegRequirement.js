import mongoose from 'mongoose';

const RegRequirementSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, // e.g., 'LDNR-MRV-ANNUAL-001'
  title: { type: String, required: true },
  jurisdiction: { type: String, default: 'LA' },
  sector: { type: String }, // 'power','bioenergy','pulp_paper',...
  description: String,
  // RRULE string for cadence (e.g., 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=31')
  rrule: { type: String, required: true },
  dueTimeLocal: { type: String, default: '17:00' }, // HH:mm
  // which artifacts are expected when filing
  filingTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FilingTemplate' },
  citations: [{ type: String }], // CFR/state links
}, { timestamps: true });

export default mongoose.model('RegRequirement', RegRequirementSchema);
