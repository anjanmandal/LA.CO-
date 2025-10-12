import mongoose from 'mongoose';
const SectorSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, // 'energy','pulp_paper','bioenergy'
  name: { type: String, required: true }
}, { timestamps: true });
export default mongoose.model('Sector', SectorSchema);
