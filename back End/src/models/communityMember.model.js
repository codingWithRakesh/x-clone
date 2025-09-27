import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const CommunityMemberSchema = new Schema({
    community: { type: Types.ObjectId, ref: 'Community', required: true, index: true },
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['member', 'moderator', 'admin'], default: 'member' }
}, { timestamps: true });

CommunityMemberSchema.index({ community: 1, user: 1 }, { unique: true });

export const CommunityMember = model('CommunityMember', CommunityMemberSchema);