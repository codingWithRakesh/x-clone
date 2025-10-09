import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Bookmark } from "../models/bookmark.model.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const toggleBookmark = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const userId = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const existingBookmark = await Bookmark.findOne({
        tweet: tweetId,
        user: userId
    });

    if (existingBookmark) {
        const unBookmark = await Bookmark.findByIdAndDelete(existingBookmark._id);
        if (!unBookmark) {
            throw new ApiError(500, "Failed to remove bookmark");
        }
        return res.status(200).json(
            new ApiResponse(200, unBookmark, "Bookmark removed successfully")
        );
    }

    const newBookmark = await Bookmark.create({
        tweet: tweetId,
        user: userId
    });

    if (!newBookmark) {
        throw new ApiError(500, "Failed to add bookmark");
    }

    return res.status(201).json(
        new ApiResponse(201, newBookmark, "Bookmark added successfully")
    );
});

const getUserBookmarks = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const bookmarks = await Bookmark.aggregate([
        { $match: { user: userId } },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweetDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'author',
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
                        $unwind: '$author'
                    },
                    {
                        $lookup: {
                            from: 'tweets',
                            localField: 'quoteOf',
                            foreignField: '_id',
                            as: 'quoteOf',
                            pipeline: [
                                {
                                    $lookup: {
                                        from: 'users',
                                        localField: 'author',
                                        foreignField: '_id',
                                        as: 'author',
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
                                    $unwind: '$author'
                                },
                                {
                                    $project: {
                                        content: 1,
                                        media: 1,
                                        author: 1,
                                        visibility: 1,
                                        createdAt: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: {
                            path: '$quoteOf',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $addFields: {
                            isLiked: {
                                $cond: {
                                    if: { $isArray: "$likes" },
                                    then: {
                                        $in: [
                                            new mongoose.Types.ObjectId(userId),
                                            "$likes"
                                        ]
                                    },
                                    else: false
                                }
                            },
                            isRetweeted: {
                                $cond: {
                                    if: { $isArray: "$retweets" },
                                    then: {
                                        $in: [
                                            new mongoose.Types.ObjectId(userId),
                                            "$retweets"
                                        ]
                                    },
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            quoteOf: {
                                $cond: {
                                    if: {
                                        $and: [
                                            { $ne: ["$quoteOf", null] },
                                            { $eq: ["$quoteOf.visibility", "private"] },
                                            { $ne: ["$quoteOf.author._id", new mongoose.Types.ObjectId(userId)] }
                                        ]
                                    },
                                    then: null,
                                    else: "$quoteOf"
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            media: 1,
                            author: 1,
                            replyTo: 1,
                            isReply: 1,
                            isQuote: 1,
                            quoteOf: 1,
                            likesCount: 1,
                            repliesCount: 1,
                            retweetCount: 1,
                            visibility: 1,
                            pinned: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            isLiked: 1,
                            isRetweeted: 1
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, bookmarks, "User bookmarks retrieved successfully")
    );
});

export {
    toggleBookmark,
    getUserBookmarks
}