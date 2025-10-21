import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const GrockCConversationSchema = new Schema({
    user : { type: Types.ObjectId, ref: "User", required: true, index: true },
    message : { type: String, required: true },
    isGrock : { type: Boolean, default: false },
    messageRef : { type: Types.ObjectId, ref: "GrockMessage", required: true, index: true }
}, { timestamps: true });

export const GrockConversation = model("GrockConversation", GrockCConversationSchema);