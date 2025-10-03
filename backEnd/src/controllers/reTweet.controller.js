import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { Retweet } from "../models/reTweet.model.js";
import { uploadOnCloudinary, deleteFromCloudinary, getPublicId } from "../utils/cloudinary.js"
import sharp from "sharp";
import mongoose from "mongoose";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";


const userLookup = {
    $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
            {
                $project: {
                    password: 0,
                    roles: 0,
                    isLocked: 0,
                    loginAttempts: 0,
                    lockUntil: 0,
                    oauth: 0,
                    OTP: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0,
                    lastLoginAt: 0,
                    refreshToken: 0
                }
            }
        ]
    }
};

const unwindUser = {
    $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true
    }
};

const tweetLookup = {
    $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweet",
        pipeline: [
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "author",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                displayName: 1,
                                avatarUrl: 1,
                                isVerified: 1,
                                bio: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$author",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]
    }
};

const unwindTweet = {
    $unwind: {
        path: "$tweet",
        preserveNullAndEmptyArrays: true
    }
};

const createRetweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { comment } = req.body;
    const userId = req.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(tweetId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "author",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatarUrl: 1,
                            isVerified: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$author"
        }
    ]);

    if (!tweet || tweet.length === 0) {
        throw new ApiError(404, "Tweet not found");
    }

    // Check if retweet already exists
    const existingRetweet = await Retweet.findOne({
        user: userId,
        tweet: tweetId
    });

    if (existingRetweet) {
        throw new ApiError(409, "You have already retweeted this tweet");
    }

    // Create retweet
    const retweet = await Retweet.create({
        user: userId,
        tweet: tweetId,
        comment: comment || undefined
    });

    // Increment retweet count on the original tweet
    await Tweet.findByIdAndUpdate(tweetId, {
        $inc: { retweetCount: 1 }
    });

    // Increment user's tweetsCount
    await User.findByIdAndUpdate(userId, {
        $inc: { tweetsCount: 1 }
    });

    // Fetch the created retweet with aggregation
    const retweetWithDetails = await Retweet.aggregate([
        {
            $match: {
                _id: retweet._id
            }
        },
        userLookup,
        unwindUser,
        tweetLookup,
        unwindTweet
    ]);

    if (!retweetWithDetails || retweetWithDetails.length === 0) {
        throw new ApiError(500, "Failed to create retweet");
    }

    res.status(201).json(
        new ApiResponse(201, retweetWithDetails[0], comment ? "Quote retweet created successfully" : "Retweet created successfully")
    );
});

// Remove retweet
const removeRetweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    // Find and delete the retweet
    const retweet = await Retweet.findOneAndDelete({
        user: userId,
        tweet: tweetId
    });

    if (!retweet) {
        throw new ApiError(404, "Retweet not found");
    }

    // Decrement retweet count on the original tweet
    await Tweet.findByIdAndUpdate(tweetId, {
        $inc: { retweetCount: -1 }
    });

    res.status(200).json(
        new ApiResponse(200, null, "Retweet removed successfully")
    );
});

// Get retweets for a specific tweet
const getTweetRetweets = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if tweet exists
    const tweetExists = await Tweet.findById(tweetId);
    if (!tweetExists) {
        throw new ApiError(404, "Tweet not found");
    }

    const retweets = await Retweet.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limitNum
        },
        userLookup,
        unwindUser,
        tweetLookup,
        unwindTweet,
        {
            $project: {
                _id: 1,
                comment: 1,
                createdAt: 1,
                updatedAt: 1,
                user: {
                    _id: 1,
                    username: 1,
                    displayName: 1,
                    avatarUrl: 1,
                    isVerified: 1,
                    bio: 1
                },
                tweet: {
                    _id: 1,
                    content: 1,
                    media: 1,
                    likesCount: 1,
                    repliesCount: 1,
                    retweetCount: 1,
                    createdAt: 1,
                    author: 1
                }
            }
        }
    ]);

    // Get total count for pagination
    const totalCount = await Retweet.countDocuments({
        tweet: new mongoose.Types.ObjectId(tweetId)
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json(
        new ApiResponse(200, {
            retweets,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        }, "Retweets fetched successfully")
    );
});

// Get user's retweets
const getUserRetweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
        throw new ApiError(404, "User not found");
    }

    const retweets = await Retweet.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limitNum
        },
        userLookup,
        unwindUser,
        tweetLookup,
        unwindTweet,
        {
            $project: {
                _id: 1,
                comment: 1,
                createdAt: 1,
                updatedAt: 1,
                user: {
                    _id: 1,
                    username: 1,
                    displayName: 1,
                    avatarUrl: 1,
                    isVerified: 1
                },
                tweet: {
                    _id: 1,
                    content: 1,
                    media: 1,
                    likesCount: 1,
                    repliesCount: 1,
                    retweetCount: 1,
                    createdAt: 1,
                    author: {
                        _id: 1,
                        username: 1,
                        displayName: 1,
                        avatarUrl: 1,
                        isVerified: 1
                    }
                }
            }
        }
    ]);

    // Get total count for pagination
    const totalCount = await Retweet.countDocuments({
        user: new mongoose.Types.ObjectId(userId)
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json(
        new ApiResponse(200, {
            retweets,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        }, "User retweets fetched successfully")
    );
});

// Get current user's retweets
const getMyRetweets = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const retweets = await Retweet.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limitNum
        },
        userLookup,
        unwindUser,
        tweetLookup,
        unwindTweet,
        {
            $project: {
                _id: 1,
                comment: 1,
                createdAt: 1,
                updatedAt: 1,
                tweet: {
                    _id: 1,
                    content: 1,
                    media: 1,
                    likesCount: 1,
                    repliesCount: 1,
                    retweetCount: 1,
                    createdAt: 1,
                    author: {
                        _id: 1,
                        username: 1,
                        displayName: 1,
                        avatarUrl: 1,
                        isVerified: 1
                    }
                }
            }
        }
    ]);

    // Get total count for pagination
    const totalCount = await Retweet.countDocuments({
        user: new mongoose.Types.ObjectId(userId)
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json(
        new ApiResponse(200, {
            retweets,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        }, "Your retweets fetched successfully")
    );
});

// Check if user has retweeted a tweet
const checkRetweetStatus = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const retweet = await Retweet.findOne({
        user: userId,
        tweet: tweetId
    });

    res.status(200).json(
        new ApiResponse(200, {
            hasRetweeted: !!retweet,
            retweetId: retweet?._id || null,
            isQuote: !!retweet?.comment
        }, "Retweet status checked successfully")
    );
});

export {
    createRetweet,
    removeRetweet,
    getTweetRetweets,
    getUserRetweets,
    getMyRetweets,
    checkRetweetStatus
};