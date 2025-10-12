import mongoose from 'mongoose';
const FacilitySchema = new mongoose.Schema({
  externalRef: String,
  name: { type: String, required: true, index: true },
  sectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [lon, lat]
  },
  meta: { type: Object, default: {} }
}, { timestamps: true });
export default mongoose.model('Facility', FacilitySchema);
