import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const GrockMessageSchema = new Schema({
    name : { type: String, required: true },
    user : { type: Types.ObjectId, ref: "User", required: true, index: true },
    messages : [{ type: Types.ObjectId, ref: "GrockConversation" }]
}, { timestamps: true });

export const GrockMessage = model("GrockMessage", GrockMessageSchema);