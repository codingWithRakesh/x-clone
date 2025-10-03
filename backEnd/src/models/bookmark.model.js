import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const BookmarkSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true },
    tweet: { type: Types.ObjectId, ref: 'Tweet', required: true }
}, { timestamps: true });

BookmarkSchema.index({ user: 1, tweet: 1 }, { unique: true });

export const Bookmark = model('Bookmark', BookmarkSchema);