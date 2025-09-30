import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const RetweetSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tweet: { type: Types.ObjectId, ref: 'Tweet', required: true, index: true },
    comment: { type: String }, // for quote retweet
}, { timestamps: true });


RetweetSchema.index({ user: 1, tweet: 1 }, { unique: true });

export const Retweet = model('Retweet', RetweetSchema);