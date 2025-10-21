import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { GrockMessage } from "../models/grockMessage.model.js";
import { GrockConversation } from "../models/grockConversation.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function geminiValue(content) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API key is not configured");
        }

        if (!content || typeof content !== 'string') {
            throw new Error("Invalid content provided");
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
        });

        if (response && response.candidates && response.candidates[0]) {
            return response.candidates[0].content.parts[0].text;
        } else if (response && response.text) {
            return response.text;
        } else {
            throw new Error("Invalid response format from Gemini API");
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new ApiError(500, `AI service error: ${error.message}`);
    }
}

// Create new conversation with AI response
const createGrockConversation = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const { userMessage } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID");
    }

    if (!userMessage || userMessage.trim() === '') {
        throw new ApiError(400, "Message content is required");
    }

    const grockMessage = await GrockMessage.findOne({ _id: messageId, user: userId });
    if (!grockMessage) {
        throw new ApiError(404, "Grock message not found");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create user message
        const userConversation = await GrockConversation.create([{
            user: userId,
            messageRef: messageId,
            message: userMessage,
            isGrock: false
        }], { session });

        // Get AI response
        const aiResponse = await geminiValue(userMessage);

        // Create AI message
        const grockConversation = await GrockConversation.create([{
            user: userId,
            messageRef: messageId,
            message: aiResponse,
            isGrock: true
        }], { session });

        // Update GrockMessage with both conversation IDs
        await GrockMessage.findByIdAndUpdate(
            messageId,
            {
                $push: {
                    messages: {
                        $each: [userConversation[0]._id, grockConversation[0]._id]
                    }
                }
            },
            { session }
        );

        await session.commitTransaction();

        const responseData = {
            userMessage: userConversation[0],
            grockResponse: grockConversation[0]
        };

        return res.status(201).json(new ApiResponse(201, responseData, "Conversation created successfully"));

    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, `Failed to create conversation: ${error.message}`);
    } finally {
        session.endSession();
    }
});

// Get all conversations for a specific message
const getConversationsByMessageId = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID");
    }

    // Verify the message belongs to the user
    const grockMessage = await GrockMessage.findOne({ _id: messageId, user: userId });
    if (!grockMessage) {
        throw new ApiError(404, "Grock message not found");
    }

    const conversations = await GrockConversation.aggregate([
        {
            $match: {
                messageRef: new mongoose.Types.ObjectId(messageId),
                user: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: { createdAt: 1 }
        },
        {
            $project: {
                message: 1,
                isGrock: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, conversations, "Conversations retrieved successfully"));
});

// Get single conversation by ID
const getConversationById = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    const conversation = await GrockConversation.findOne({
        _id: conversationId,
        user: userId
    });

    if (!conversation) {
        throw new ApiError(404, "Conversation not found");
    }

    return res.status(200).json(new ApiResponse(200, conversation, "Conversation retrieved successfully"));
});

// Update a conversation message
const updateConversation = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    if (!message || message.trim() === '') {
        throw new ApiError(400, "Message content is required");
    }

    const conversation = await GrockConversation.findOne({
        _id: conversationId,
        user: userId,
        isGrock: false // Only allow updating user messages, not AI responses
    });

    if (!conversation) {
        throw new ApiError(404, "Conversation not found or cannot be updated");
    }

    const updatedConversation = await GrockConversation.findByIdAndUpdate(
        conversationId,
        { message: message.trim() },
        { new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedConversation, "Conversation updated successfully"));
});

// Delete a conversation
const deleteConversation = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the conversation first to get messageRef
        const conversation = await GrockConversation.findOne({
            _id: conversationId,
            user: userId
        });

        if (!conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        // Delete the conversation
        await GrockConversation.findByIdAndDelete(conversationId, { session });

        // Remove from GrockMessage's messages array
        await GrockMessage.findByIdAndUpdate(
            conversation.messageRef,
            {
                $pull: { messages: conversationId }
            },
            { session }
        );

        await session.commitTransaction();

        return res.status(200).json(new ApiResponse(200, {}, "Conversation deleted successfully"));

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// Delete all conversations for a message
const deleteAllConversationsByMessageId = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Verify the message belongs to the user
        const grockMessage = await GrockMessage.findOne({ _id: messageId, user: userId });
        if (!grockMessage) {
            throw new ApiError(404, "Grock message not found");
        }

        // Get all conversation IDs to delete
        const conversations = await GrockConversation.find({
            messageRef: messageId,
            user: userId
        }).select('_id');

        const conversationIds = conversations.map(conv => conv._id);

        // Delete all conversations
        await GrockConversation.deleteMany(
            { _id: { $in: conversationIds } },
            { session }
        );

        // Clear messages array in GrockMessage
        await GrockMessage.findByIdAndUpdate(
            messageId,
            { $set: { messages: [] } },
            { session }
        );

        await session.commitTransaction();

        return res.status(200).json(new ApiResponse(200, { deletedCount: conversationIds.length }, "All conversations deleted successfully"));

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// Continue conversation (add to existing message thread)
const continueConversation = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const { userMessage } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        throw new ApiError(400, "Invalid message ID");
    }

    if (!userMessage || userMessage.trim() === '') {
        throw new ApiError(400, "Message content is required");
    }

    const grockMessage = await GrockMessage.findOne({ _id: messageId, user: userId });
    if (!grockMessage) {
        throw new ApiError(404, "Grock message not found");
    }

    // Get previous conversations for context
    const previousConversations = await GrockConversation.find({
        messageRef: messageId,
        user: userId
    }).sort({ createdAt: 1 }).limit(10); // Get last 10 messages for context

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create user message
        const userConversation = await GrockConversation.create([{
            user: userId,
            messageRef: messageId,
            message: userMessage,
            isGrock: false
        }], { session });

        // Build context from previous conversations
        const context = previousConversations.map(conv => 
            `${conv.isGrock ? 'AI' : 'User'}: ${conv.message}`
        ).join('\n');

        const promptWithContext = `${context}\nUser: ${userMessage}\nAI:`;

        // Get AI response with context
        const aiResponse = await geminiValue(promptWithContext);

        // Create AI message
        const grockConversation = await GrockConversation.create([{
            user: userId,
            messageRef: messageId,
            message: aiResponse,
            isGrock: true
        }], { session });

        // Update GrockMessage with new conversation IDs
        await GrockMessage.findByIdAndUpdate(
            messageId,
            {
                $push: {
                    messages: {
                        $each: [userConversation[0]._id, grockConversation[0]._id]
                    }
                }
            },
            { session }
        );

        await session.commitTransaction();

        const responseData = {
            userMessage: userConversation[0],
            grockResponse: grockConversation[0]
        };

        return res.status(201).json(new ApiResponse(201, responseData, "Conversation continued successfully"));

    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, `Failed to continue conversation: ${error.message}`);
    } finally {
        session.endSession();
    }
});

// Get conversation statistics
const getConversationStats = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const stats = await GrockConversation.aggregate([
        {
            $match: { user: new mongoose.Types.ObjectId(userId) }
        },
        {
            $group: {
                _id: "$isGrock",
                count: { $sum: 1 },
                totalMessagesLength: { $sum: { $strLenCP: "$message" } },
                avgMessageLength: { $avg: { $strLenCP: "$message" } }
            }
        },
        {
            $project: {
                type: {
                    $cond: {
                        if: "$_id",
                        then: "ai_messages",
                        else: "user_messages"
                    }
                },
                count: 1,
                totalMessagesLength: 1,
                avgMessageLength: { $round: ["$avgMessageLength", 2] }
            }
        }
    ]);

    const totalStats = {
        total_conversations: stats.reduce((sum, stat) => sum + stat.count, 0),
        breakdown: stats
    };

    return res.status(200).json(new ApiResponse(200, totalStats, "Conversation statistics retrieved successfully"));
});

export {
    createGrockConversation,
    getConversationsByMessageId,
    getConversationById,
    updateConversation,
    deleteConversation,
    deleteAllConversationsByMessageId,
    continueConversation,
    getConversationStats
};