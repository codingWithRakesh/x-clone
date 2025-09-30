import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const CommunitySchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    creator: { type: Types.ObjectId, ref: 'User', required: true },
    isPrivate: { type: Boolean, default: false },
    membersCount: { type: Number, default: 0 }
}, { timestamps: true });

export const Community = model('Community', CommunitySchema);