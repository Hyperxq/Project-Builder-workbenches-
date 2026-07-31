import * as mongoose from 'mongoose';

export const AuthorSchema = new mongoose.Schema({}, { versionKey: false });

AuthorSchema.add({
  authorId: { type: Number, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  country: { type: String, required: false },
  active: { type: Boolean, required: true, default: true },
});
