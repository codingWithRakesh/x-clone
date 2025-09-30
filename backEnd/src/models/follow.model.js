import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const FollowSchema = new Schema({
    follower: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    following: { type: Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });


FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = model('Follow', FollowSchema);