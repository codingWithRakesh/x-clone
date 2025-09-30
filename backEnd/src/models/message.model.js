import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const MessageSchema = new Schema({
    from: { type: Types.ObjectId, ref: 'User', required: true },
    to: { type: Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    media: [{ type: String }],
    read: { type: Boolean, default: false }
}, { timestamps: true });


MessageSchema.index({ from: 1, to: 1, createdAt: -1 });


export const Message = model('Message', MessageSchema);