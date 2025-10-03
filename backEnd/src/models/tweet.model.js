import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const TweetSchema = new Schema({
    author: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, maxlength: 280 },
    media: [{ type: String }], // store URLs (Cloudinary, S3, IPFS)
    replyTo: { type: Types.ObjectId, ref: 'Tweet' }, // if this is a reply
    isReply: { type: Boolean, default: false },
    isQuote: { type: Boolean, default: false },
    quoteOf: { type: Types.ObjectId, ref: 'Tweet' },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    retweetCount: { type: Number, default: 0 },
    visibility: { type: String, enum: ['public', 'private', 'protected'], default: 'public' },
    pinned: { type: Boolean, default: false }
}, { timestamps: true });


TweetSchema.index({ author: 1, createdAt: -1 });
TweetSchema.index({ createdAt: -1 });

export const Tweet = model('Tweet', TweetSchema);