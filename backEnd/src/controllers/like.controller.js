import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const likeTweet = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const userId = req.user._id;
    let tweet;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const existingLike = await Like.findOne({ tweet: tweetId, user: userId });
    if (existingLike) {
        const unLike = await Like.findByIdAndDelete(existingLike._id);
        if (!unLike) {
            throw new ApiError(500, "Failed to unlike the tweet");
        }
        tweet = await Tweet.findByIdAndUpdate(tweetId, { $inc: { likesCount: -1 } }, { new: true });
        if (!tweet) {
            throw new ApiError(404, "Tweet not found");
        }
        return res.status(200).json(new ApiResponse(200, unLike, "Tweet unliked successfully"));
    }

    const like = await Like.create({ tweet: tweetId, user: userId });
    if (!like) {
        throw new ApiError(500, "Failed to like the tweet");
    }
    tweet = await Tweet.findByIdAndUpdate(tweetId, { $inc: { likesCount: 1 } }, { new: true });
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    return res.status(201).json(new ApiResponse(201, like, "Tweet liked successfully"));
});

export { likeTweet };