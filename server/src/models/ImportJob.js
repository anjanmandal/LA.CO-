import mongoose from 'mongoose';

const ImportJobSchema = new mongoose.Schema({
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', index: true },
  filename: String,
  headerMap: { type: Object, default: {} },
  stats: {
    rowsTotal: { type: Number, default: 0 },
    rowsImported: { type: Number, default: 0 },
    rowsSkipped: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    invalid: { type: Number, default: 0 }
  },
  checksumSha256: String,
  status: { type: String, enum: ['pending','completed','failed'], default: 'pending' },
  errors: { type: Array, default: [] }
}, { timestamps: true });

export default mongoose.model('ImportJob', ImportJobSchema);
