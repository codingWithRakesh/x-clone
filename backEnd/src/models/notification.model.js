import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const NotificationSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true }, // who should receive
    type: { type: String, enum: ['like', 'reply', 'retweet', 'follow', 'mention', 'message', 'system'], required: true },
    fromUser: { type: Types.ObjectId, ref: 'User' },
    tweet: { type: Types.ObjectId, ref: 'Tweet' },
    read: { type: Boolean, default: false }
}, { timestamps: true });


NotificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = model('Notification', NotificationSchema);