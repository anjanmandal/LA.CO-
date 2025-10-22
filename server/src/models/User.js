import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  email:     { type: String, unique: true, required: true, lowercase: true, index: true },
  name:      { type: String, required: true },
  // Simple role model: 'operator' | 'regulator' | 'public' | 'admin'
  role:      { type: String, enum: ['operator','regulator','public','admin'], default: 'public', index: true },
  orgId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  password:  { type: String, required: true, select: false },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.pre('save', async function(next){
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', UserSchema);
