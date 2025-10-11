import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Bookmark } from "../models/bookmark.model.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Retweet } from "../models/reTweet.model.js";
import { Follow } from "../models/follow.model.js";
import { Like } from "../models/like.model.js";
import { Notification } from "../models/notification.model.js"
import mongoose from "mongoose";

const getUserNotifications = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const notifications = await Notification.aggregate([
        {
            $match: { user: userId }
        },
        {
            $sort: { createdAt: -1 }
        },
        { $limit: 50 },
        {
            $lookup : {
                from: "users",
                localField: "fromUser",
                foreignField: "_id",
                as: "fromUser",
                pipeline: [
                    {
                        $project : {
                            _id: 1,
                            fullName: 1,
                            username: 1,
                            avatarUrl: 1,
                            isVerified: 1,
                            email : 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: { path: "$fromUser", preserveNullAndEmptyArrays: true }
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweet",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            content: 1,
                            media: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    }
                ]
            }
        }
    ])
    if (!notifications) {
        throw new ApiError(404, "No notifications found");
    }
    res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

export {
    getUserNotifications
}