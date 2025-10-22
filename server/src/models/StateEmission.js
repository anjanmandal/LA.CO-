import mongoose from 'mongoose';

const StateEmissionSchema = new mongoose.Schema({
  year: { type: Number, required: true, index: true },
  facilityName: { type: String, required: true },
  ghgrpId: { type: String },
  address: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  city: { type: String },
  county: { type: String },
  state: { type: String, required: true, index: true },
  zipCode: { type: String },
  parentCompanies: { type: String },
  ghgQuantity: { type: Number, required: true },
  subparts: [{ type: String }],
}, { timestamps: true });

StateEmissionSchema.index({ state: 1, year: 1 });

export default mongoose.model('StateEmission', StateEmissionSchema);
