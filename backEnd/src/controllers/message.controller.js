import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { uploadOnCloudinary, deleteFromCloudinary, getPublicId } from "../utils/cloudinary.js";
import sharp from "sharp";

// Helper functions
const bufferToBase64 = (buffer, mimetype) => {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

const calculateImageQuality = (fileSize, maxSize) => {
    if (fileSize <= maxSize * 0.5) return 85;
    if (fileSize <= maxSize * 0.8) return 75;
    return 65;
};

// Send message
const sendMessage = asyncHandler(async (req, res) => {
    const { to, text } = req.body;
    const from = req.user._id;

    if (!to) {
        throw new ApiError(400, "Recipient is required");
    }

    if (!text && (!req.files || req.files.length === 0)) {
        throw new ApiError(400, "Message content or media is required");
    }

    if (text && text.length > 1000) {
        throw new ApiError(400, "Message text cannot exceed 1000 characters");
    }

    // Check if recipient exists
    const recipient = await User.findById(to);
    if (!recipient) {
        throw new ApiError(404, "Recipient not found");
    }

    // Prevent sending message to yourself
    if (from.toString() === to) {
        throw new ApiError(400, "You cannot send message to yourself");
    }

    const MAX_SIZES = {
        image: 5 * 1024 * 1024, // 5MB
        video: 10 * 1024 * 1024, // 10MB
        gif: 5 * 1024 * 1024, // 5MB
        document: 10 * 1024 * 1024 // 10MB
    };

    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    ];

    const allowedVideoTypes = [
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];

    const allowedDocumentTypes = [
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/rtf'
    ];

    const mediaUrls = [];

    if (req.files && req.files.length > 0) {
        if (req.files.length > 5) {
            throw new ApiError(400, "You can upload a maximum of 5 files per message");
        }

        for (const file of req.files) {
            const { buffer, mimetype, size, originalname } = file;

            if (!buffer || !mimetype) {
                throw new ApiError(400, "Invalid file");
            }

            let fileUrl;
            let resourceType = "auto";

            if (allowedImageTypes.includes(mimetype) && !mimetype.includes('gif')) {
                if (size > MAX_SIZES.image) {
                    throw new ApiError(400, "Image size must be less than 5MB");
                }

                const targetQuality = calculateImageQuality(size, 1 * 1024 * 1024);
                const processedBuffer = await sharp(buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .jpeg({ quality: targetQuality, progressive: true, optimiseScans: true })
                    .toBuffer();

                const base64File = bufferToBase64(processedBuffer, mimetype);
                const result = await uploadOnCloudinary(base64File, "image");

                if (!result?.secure_url) {
                    throw new ApiError(500, "Cloudinary image upload failed");
                }
                fileUrl = result.secure_url;

            } else if (mimetype.includes('gif')) {
                if (size > MAX_SIZES.gif) {
                    throw new ApiError(400, "GIF size must be less than 5MB");
                }

                const base64File = bufferToBase64(buffer, mimetype);
                const result = await uploadOnCloudinary(base64File, "image");

                if (!result?.secure_url) {
                    throw new ApiError(500, "Cloudinary GIF upload failed");
                }
                fileUrl = result.secure_url;

            } else if (allowedVideoTypes.includes(mimetype)) {
                if (size > MAX_SIZES.video) {
                    throw new ApiError(400, "Video size must be less than 10MB");
                }

                const base64File = bufferToBase64(buffer, mimetype);
                const result = await uploadOnCloudinary(base64File, "video");

                if (!result?.secure_url) {
                    throw new ApiError(500, "Cloudinary video upload failed");
                }
                fileUrl = result.secure_url;

            } else if (allowedDocumentTypes.includes(mimetype)) {
                if (size > MAX_SIZES.document) {
                    throw new ApiError(400, "Document size must be less than 10MB");
                }

                const base64File = bufferToBase64(buffer, mimetype);
                const result = await uploadOnCloudinary(base64File, "raw");

                if (!result?.secure_url) {
                    throw new ApiError(500, "Cloudinary document upload failed");
                }
                fileUrl = result.secure_url;

            } else {
                throw new ApiError(400, `File type ${mimetype} is not supported`);
            }

            if (fileUrl) {
                mediaUrls.push({
                    url: fileUrl,
                    type: mimetype,
                    name: originalname
                });
            }
        }
    }

    const message = await Message.create({
        from,
        to,
        text: text?.trim(),
        media: mediaUrls
    });

    const messageWithDetails = await Message.aggregate([
        {
            $match: { _id: message._id }
        },
        {
            $lookup: {
                from: "users",
                localField: "from",
                foreignField: "_id",
                as: "fromInfo"
            }
        },
        {
            $unwind: "$fromInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "to",
                foreignField: "_id",
                as: "toInfo"
            }
        },
        {
            $unwind: "$toInfo"
        },
        {
            $project: {
                _id: 1,
                text: 1,
                media: 1,
                read: 1,
                createdAt: 1,
                updatedAt: 1,
                from: {
                    _id: "$fromInfo._id",
                    username: "$fromInfo.username",
                    fullName: "$fromInfo.fullName",
                    avatarUrl: "$fromInfo.avatarUrl",
                    isVerified: "$fromInfo.isVerified"
                },
                to: {
                    _id: "$toInfo._id",
                    username: "$toInfo.username",
                    fullName: "$toInfo.fullName",
                    avatarUrl: "$toInfo.avatarUrl",
                    isVerified: "$toInfo.isVerified"
                }
            }
        }
    ]);

    return res.status(201).json(
        new ApiResponse(201, messageWithDetails[0], "Message sent successfully")
    );
});

// Get conversation between two users
const getConversation = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.aggregate([
        {
            $match: {
                $or: [
                    { from: currentUserId, to: new mongoose.Types.ObjectId(userId) },
                    { from: new mongoose.Types.ObjectId(userId), to: currentUserId }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "from",
                foreignField: "_id",
                as: "fromInfo"
            }
        },
        {
            $unwind: "$fromInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "to",
                foreignField: "_id",
                as: "toInfo"
            }
        },
        {
            $unwind: "$toInfo"
        },
        {
            $project: {
                _id: 1,
                text: 1,
                media: 1,
                read: 1,
                createdAt: 1,
                updatedAt: 1,
                from: {
                    _id: "$fromInfo._id",
                    username: "$fromInfo.username",
                    fullName: "$fromInfo.fullName",
                    avatarUrl: "$fromInfo.avatarUrl",
                    isVerified: "$fromInfo.isVerified"
                },
                to: {
                    _id: "$toInfo._id",
                    username: "$toInfo.username",
                    fullName: "$toInfo.fullName",
                    avatarUrl: "$toInfo.avatarUrl",
                    isVerified: "$toInfo.isVerified"
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    // Mark messages as read
    await Message.updateMany(
        {
            from: userId,
            to: currentUserId,
            read: false
        },
        {
            $set: { read: true }
        }
    );

    const total = await Message.countDocuments({
        $or: [
            { from: currentUserId, to: userId },
            { from: userId, to: currentUserId }
        ]
    });

    return res.status(200).json(
        new ApiResponse(200, {
            messages: messages.reverse(), // Reverse to show oldest first
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }, "Conversation retrieved successfully")
    );
});

// Get all conversations for current user
const getConversations = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get unique users that current user has conversations with
    const conversations = await Message.aggregate([
        {
            $match: {
                $or: [
                    { from: currentUserId },
                    { to: currentUserId }
                ]
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$from", currentUserId] },
                        "$to",
                        "$from"
                    ]
                },
                lastMessage: { $first: "$$ROOT" },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$to", currentUserId] },
                                    { $eq: ["$read", false] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                totalMessages: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userInfo"
            }
        },
        {
            $unwind: "$userInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "lastMessage.from",
                foreignField: "_id",
                as: "lastMessageFromInfo"
            }
        },
        {
            $unwind: "$lastMessageFromInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "lastMessage.to",
                foreignField: "_id",
                as: "lastMessageToInfo"
            }
        },
        {
            $unwind: "$lastMessageToInfo"
        },
        {
            $project: {
                _id: 1,
                user: {
                    _id: "$userInfo._id",
                    username: "$userInfo.username",
                    fullName: "$userInfo.fullName",
                    avatarUrl: "$userInfo.avatarUrl",
                    isVerified: "$userInfo.isVerified"
                },
                lastMessage: {
                    _id: "$lastMessage._id",
                    text: "$lastMessage.text",
                    media: "$lastMessage.media",
                    read: "$lastMessage.read",
                    createdAt: "$lastMessage.createdAt",
                    from: {
                        _id: "$lastMessageFromInfo._id",
                        username: "$lastMessageFromInfo.username",
                        fullName: "$lastMessageFromInfo.fullName"
                    },
                    to: {
                        _id: "$lastMessageToInfo._id",
                        username: "$lastMessageToInfo.username",
                        fullName: "$lastMessageToInfo.fullName"
                    }
                },
                unreadCount: 1,
                totalMessages: 1
            }
        },
        {
            $sort: { "lastMessage.createdAt": -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    const total = await Message.aggregate([
        {
            $match: {
                $or: [
                    { from: currentUserId },
                    { to: currentUserId }
                ]
            }
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$from", currentUserId] },
                        "$to",
                        "$from"
                    ]
                }
            }
        },
        {
            $count: "total"
        }
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    return res.status(200).json(
        new ApiResponse(200, {
            conversations,
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit)
        }, "Conversations retrieved successfully")
    );
});

// Mark messages as read
const markAsRead = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const result = await Message.updateMany(
        {
            from: userId,
            to: currentUserId,
            read: false
        },
        {
            $set: { read: true }
        }
    );

    return res.status(200).json(
        new ApiResponse(200, { modifiedCount: result.modifiedCount }, "Messages marked as read")
    );
});

// Delete message
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findOne({
        _id: messageId,
        from: currentUserId // Only sender can delete message
    });

    if (!message) {
        throw new ApiError(404, "Message not found or you don't have permission to delete it");
    }

    // Delete media from Cloudinary if exists
    if (message.media && message.media.length > 0) {
        for (const media of message.media) {
            try {
                const publicId = getPublicId(media.url);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } catch (error) {
                console.error("Error deleting media from Cloudinary:", error);
            }
        }
    }

    await Message.findByIdAndDelete(messageId);

    return res.status(200).json(
        new ApiResponse(200, null, "Message deleted successfully")
    );
});

// Get unread message count
const getUnreadCount = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;

    const unreadCount = await Message.countDocuments({
        to: currentUserId,
        read: false
    });

    return res.status(200).json(
        new ApiResponse(200, { unreadCount }, "Unread count retrieved successfully")
    );
});

// Search messages
const searchMessages = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const currentUserId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!query || query.trim() === "") {
        throw new ApiError(400, "Search query is required");
    }

    const messages = await Message.aggregate([
        {
            $match: {
                $or: [
                    { from: currentUserId },
                    { to: currentUserId }
                ],
                text: { $regex: query, $options: 'i' }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "from",
                foreignField: "_id",
                as: "fromInfo"
            }
        },
        {
            $unwind: "$fromInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "to",
                foreignField: "_id",
                as: "toInfo"
            }
        },
        {
            $unwind: "$toInfo"
        },
        {
            $project: {
                _id: 1,
                text: 1,
                media: 1,
                read: 1,
                createdAt: 1,
                updatedAt: 1,
                from: {
                    _id: "$fromInfo._id",
                    username: "$fromInfo.username",
                    fullName: "$fromInfo.fullName",
                    avatarUrl: "$fromInfo.avatarUrl"
                },
                to: {
                    _id: "$toInfo._id",
                    username: "$toInfo.username",
                    fullName: "$toInfo.fullName",
                    avatarUrl: "$toInfo.avatarUrl"
                },
                conversationWith: {
                    $cond: [
                        { $eq: ["$from", currentUserId] },
                        "$toInfo",
                        "$fromInfo"
                    ]
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    const total = await Message.countDocuments({
        $or: [
            { from: currentUserId },
            { to: currentUserId }
        ],
        text: { $regex: query, $options: 'i' }
    });

    return res.status(200).json(
        new ApiResponse(200, {
            messages,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            query
        }, "Messages search completed successfully")
    );
});

export {
    sendMessage,
    getConversation,
    getConversations,
    markAsRead,
    deleteMessage,
    getUnreadCount,
    searchMessages
};