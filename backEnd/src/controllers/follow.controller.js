import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import mongoose from "mongoose";

const followUnfollowUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const followerId = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }
    if (followerId.toString() === userId) {
        throw new ApiError(400, "You cannot follow yourself");
    }

    const existFollow = await Follow.findOne({ 
        follower: followerId, 
        following: userId 
    });

    if (existFollow) {
        const unfollow = await Follow.findByIdAndDelete(existFollow._id);
        if (!unfollow) {
            throw new ApiError(500, "Failed to unfollow user");
        }
        await Notification.deleteOne({
            user: userId, // who should receive the notification
            type: 'follow',
            fromUser: followerId
        });
        const checkFollowers = await User.findByIdAndUpdate(
            userId, 
            { $inc: { followersCount: -1 } }, 
            { new: true }
        );
        const checkFollowing = await User.findByIdAndUpdate(
            followerId, 
            { $inc: { followingCount: -1 } }, 
            { new: true }
        );
        if (!checkFollowers || !checkFollowing) {
            throw new ApiError(404, "User not found");
        }
        return res.status(200).json(new ApiResponse(200, unfollow, "User unfollowed successfully"));
    }
    const follow = await Follow.create({ 
        follower: followerId, 
        following: userId 
    });
    if (!follow) {
        throw new ApiError(500, "Failed to follow user");
    }
    await Notification.create({
        user: userId, // who should receive the notification
        type: 'follow',
        fromUser: followerId
    });
    const updatedUser = await User.findByIdAndUpdate(
        userId, 
        { $inc: { followersCount: 1 } }, 
        { new: true }
    );
    const updatedFollowingUser = await User.findByIdAndUpdate(
        followerId, 
        { $inc: { followingCount: 1 } }, 
        { new: true }
    );
    if (!updatedUser || !updatedFollowingUser) {
        throw new ApiError(404, "User not found");
    }
    return res.status(201).json(new ApiResponse(201, follow, "User followed successfully"));
});

const getFollowers = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const followers = await Follow.aggregate([
        {
            $match: {
                following: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "follower",
                foreignField: "_id",
                as: "followerInfo"
            }
        },
        {
            $unwind: "$followerInfo"
        },
        {
            $project: {
                _id: 1,
                follower: {
                    _id: "$followerInfo._id",
                    name: "$followerInfo.fullName",
                    username: "$followerInfo.username",
                    avatarUrl: "$followerInfo.avatarUrl"
                },
                following: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if (!followers) {
        throw new ApiError(404, "No followers found");
    }

    return res.status(200).json(new ApiResponse(200, followers, "Followers retrieved successfully"));
});

const getFollowing = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }
    
    const following = await Follow.aggregate([
        {
            $match: {
                follower: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "following",
                foreignField: "_id",
                as: "followingInfo"
            }
        },
        {
            $unwind: "$followingInfo"
        },
        {
            $project: {
                _id: 1,
                follower: 1,
                following: {
                    _id: "$followingInfo._id",
                    name: "$followingInfo.fullName",
                    username: "$followingInfo.username",
                    avatarUrl: "$followingInfo.avatarUrl"
                },
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if (!following) {
        throw new ApiError(404, "No following found");
    }

    return res.status(200).json(new ApiResponse(200, following, "Following retrieved successfully"));
});

export {
    followUnfollowUser,
    getFollowers,
    getFollowing
}