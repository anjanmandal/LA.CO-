// server/src/models/BriefCache.js
import mongoose from 'mongoose';
const BriefCacheSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
  lang: { type: String, default: 'en', index: true },
  versionKey: { type: String, index: true }, // e.g., datasetVersion+year+utilization+alerts hash
  transcript: String,
  audioUrl: String,            // where we stored the mp3
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('BriefCache', BriefCacheSchema);
