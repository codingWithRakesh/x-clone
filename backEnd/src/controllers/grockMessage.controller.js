import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { GrockMessage } from "../models/grockMessage.model.js";
import { User } from "../models/user.model.js";
import { GrockConversation } from "../models/grockConversation.model.js";
import mongoose from "mongoose";

const createGrockMessage = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const createMessage = await GrockMessage.create({ 
        name: `GrockMessage_${Date.now()}`, 
        user: userId 
    });

    if (!createMessage) {
        throw new ApiError(500, "Failed to create GrockMessage");
    }

    return res.status(201).json(new ApiResponse(201, createMessage, "GrockMessage created successfully"));

});

const getUserGrockMessages = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const messages = await GrockMessage.aggregate([
        {
            $match: { user: userId }
        },
        {
            $project : {
                name: 1,
                createdAt: 1,
                updatedAt: 1,
                messagesCount: { $size: "$messages" },
                _id: 1
            }
        }
    ])
    if (!messages) {
        throw new ApiError(404, "No messages found");
    }

    return res.status(200).json(new ApiResponse(200, messages, "GrockMessages retrieved successfully"));
});

const deleteGrockMessage = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID");
    }

    const message = await GrockMessage.findOneAndDelete({ _id: messageId, user: userId });
    if (!message) {
        throw new ApiError(404, "GrockMessage not found or already deleted");
    }

    // Optionally, delete all associated conversations
    const deleteConversations = await GrockConversation.deleteMany({ _id: { $in: message.messages } });
    if (deleteConversations.deletedCount === 0) {
        console.warn("No associated conversations were found to delete");
    }

    return res.status(200).json(new ApiResponse(200, {}, "GrockMessage and associated conversations deleted successfully"));
});

export {
    createGrockMessage,
    getUserGrockMessages,
    deleteGrockMessage
}