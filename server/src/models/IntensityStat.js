import mongoose from 'mongoose';

const IntensityStatSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  sectorCode: { type: String, index: true },  // e.g. 'power', 'energy', etc.
  year: { type: Number, required: true, index: true },
  co2eTonnes: { type: Number, required: true }, // from EmissionsObservation or operator
  unit: { type: String, required: true },       // 'MWh', 'bbl', 'ton', etc.
  outputQuantity: { type: Number, required: true }, // e.g. MWh produced
}, { timestamps: true });

IntensityStatSchema.index({ sectorCode: 1, year: 1 });

export default mongoose.model('IntensityStat', IntensityStatSchema);
