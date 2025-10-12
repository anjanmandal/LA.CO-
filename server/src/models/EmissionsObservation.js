import mongoose from 'mongoose';
import { EMISSION_SOURCE } from './common.js';

const EmissionsObservationSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number },
  co2eTonnes: { type: Number, required: true },
  scope: { type: Number, enum: [1,2,3], default: 1 },
  source: { type: String, enum: EMISSION_SOURCE, required: true },
  method: String,
  datasetVersion: String
}, { timestamps: true });

EmissionsObservationSchema.index({ facilityId: 1, year: 1, month: 1, source: 1 });

export default mongoose.model('EmissionsObservation', EmissionsObservationSchema);
