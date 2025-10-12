import mongoose from 'mongoose';

const ChunkSchema = new mongoose.Schema({
  ord: Number,
  text: String,
  tokens: Number,
  embedding: { type: [Number], index: false }, // store vector
  section: String,
  citation: String, // e.g., URL#fragment or CFR section
}, { _id: false });

const RegDocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  jurisdiction: { type: String, default: 'LA' }, // Louisiana by default
  sector: { type: String }, // optional filtering
  sourceUrl: String,
  versionTag: String,
  chunks: [ChunkSchema],
}, { timestamps: true });

export default mongoose.model('RegDocument', RegDocumentSchema);
