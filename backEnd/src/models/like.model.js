import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const LikeSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tweet: { type: Types.ObjectId, ref: 'Tweet', required: true, index: true }
}, { timestamps: true });


// prevent duplicate likes at DB level
LikeSchema.index({ user: 1, tweet: 1 }, { unique: true });

export const Like = model('Like', LikeSchema);