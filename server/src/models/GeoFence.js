import mongoose from 'mongoose';
const GeoPoly = new mongoose.Schema({
  type: { type: String, enum: ['Polygon','MultiPolygon'], required: true },
  coordinates: { type: Array, required: true }
}, { _id: false });

const GeoFenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kind: { type: String, enum: ['buffer','facility','restricted','community','water'], default: 'buffer' },
  geometry: { type: GeoPoly, index: '2dsphere' },
  threshold: { type: Number }, // optional: distance/pressure etc depending on kind
  meta: { type: Object }
}, { timestamps: true });

export default mongoose.model('GeoFence', GeoFenceSchema);
