import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Community } from "../models/community.model.js";
import { CommunityMember } from "../models/communityMember.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Retweet } from "../models/reTweet.model.js";
import mongoose from "mongoose";

// Create community
const createCommunity = asyncHandler(async (req, res) => {
    const { name, description, isPrivate = false } = req.body;
    const creatorId = req.user._id;

    if (!name) {
        throw new ApiError(400, "Community name is required");
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const community = await Community.create({
        name,
        slug,
        description,
        creator: creatorId,
        isPrivate
    });

    // Add creator as admin member
    await CommunityMember.create({
        community: community._id,
        user: creatorId,
        role: 'admin'
    });

    // Update members count
    await Community.findByIdAndUpdate(community._id, { $inc: { membersCount: 1 } });

    const communityWithDetails = await Community.aggregate([
        {
            $match: { _id: community._id }
        },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creatorInfo"
            }
        },
        {
            $unwind: "$creatorInfo"
        },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                description: 1,
                isPrivate: 1,
                membersCount: 1,
                creator: {
                    _id: "$creatorInfo._id",
                    username: "$creatorInfo.username",
                    fullName: "$creatorInfo.fullName",
                    avatarUrl: "$creatorInfo.avatarUrl"
                },
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    return res.status(201).json(
        new ApiResponse(201, communityWithDetails[0], "Community created successfully")
    );
});

// Get all communities
const getAllCommunities = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const communities = await Community.aggregate([
        {
            $match: {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creatorInfo"
            }
        },
        {
            $unwind: "$creatorInfo"
        },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                description: 1,
                isPrivate: 1,
                membersCount: 1,
                creator: {
                    _id: "$creatorInfo._id",
                    username: "$creatorInfo.username",
                    fullName: "$creatorInfo.fullName",
                    avatarUrl: "$creatorInfo.avatarUrl"
                },
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: { membersCount: -1, createdAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    const total = await Community.countDocuments({
        $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ]
    });

    return res.status(200).json(
        new ApiResponse(200, {
            communities,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }, "Communities retrieved successfully")
    );
});

const getCommunity = asyncHandler(async (req, res) => {
    const { identifier } = req.params;

    let matchStage = {};
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        matchStage = { _id: new mongoose.Types.ObjectId(identifier) };
    } else {
        matchStage = { slug: identifier };
    }

    const community = await Community.aggregate([
        {
            $match: matchStage
        },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creatorInfo"
            }
        },
        {
            $unwind: {
                path: "$creatorInfo",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "communitymembers",
                localField: "_id",
                foreignField: "community",
                as: "membersInfo"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                description: 1,
                isPrivate: 1,
                membersCount: 1,
                creator: {
                    _id: "$creatorInfo._id",
                    username: "$creatorInfo.username",
                    fullName: "$creatorInfo.fullName",
                    avatarUrl: "$creatorInfo.avatarUrl"
                },
                members: {
                    $map: {
                        input: "$membersInfo",
                        as: "member",
                        in: {
                            _id: "$$member._id",
                            role: "$$member.role",
                            joinedAt: "$$member.createdAt"
                        }
                    }
                },
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if (!community.length) {
        throw new ApiError(404, "Community not found");
    }

    return res.status(200).json(
        new ApiResponse(200, community[0], "Community retrieved successfully")
    );
});

// Update community
const updateCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const { name, description, isPrivate } = req.body;
    const userId = req.user._id;

    // Check if user is admin of the community
    const isAdmin = await CommunityMember.findOne({
        community: communityId,
        user: userId,
        role: 'admin'
    });

    if (!isAdmin) {
        throw new ApiError(403, "Only community admins can update the community");
    }

    const updateData = {};
    if (name) {
        updateData.name = name;
        updateData.slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    const community = await Community.findByIdAndUpdate(
        communityId,
        updateData,
        { new: true }
    );

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    const communityWithDetails = await Community.aggregate([
        {
            $match: { _id: community._id }
        },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creatorInfo"
            }
        },
        {
            $unwind: "$creatorInfo"
        },
        {
            $project: {
                _id: 1,
                name: 1,
                slug: 1,
                description: 1,
                isPrivate: 1,
                membersCount: 1,
                creator: {
                    _id: "$creatorInfo._id",
                    username: "$creatorInfo.username",
                    fullName: "$creatorInfo.fullName",
                    avatarUrl: "$creatorInfo.avatarUrl"
                },
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, communityWithDetails[0], "Community updated successfully")
    );
});

// Delete community
const deleteCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    // Check if user is admin of the community
    const isAdmin = await CommunityMember.findOne({
        community: communityId,
        user: userId,
        role: 'admin'
    });

    if (!isAdmin) {
        throw new ApiError(403, "Only community admins can delete the community");
    }

    // Delete all community members first
    await CommunityMember.deleteMany({ community: communityId });

    // Delete community
    const community = await Community.findByIdAndDelete(communityId);

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Community deleted successfully")
    );
});

// Get user's communities
const getUserCommunities = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const communities = await CommunityMember.aggregate([
        {
            $match: { user: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "communities",
                localField: "community",
                foreignField: "_id",
                as: "communityInfo"
            }
        },
        {
            $unwind: "$communityInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "communityInfo.creator",
                foreignField: "_id",
                as: "creatorInfo"
            }
        },
        {
            $unwind: "$creatorInfo"
        },
        {
            $project: {
                _id: "$communityInfo._id",
                name: "$communityInfo.name",
                slug: "$communityInfo.slug",
                description: "$communityInfo.description",
                isPrivate: "$communityInfo.isPrivate",
                membersCount: "$communityInfo.membersCount",
                role: "$role",
                creator: {
                    _id: "$creatorInfo._id",
                    username: "$creatorInfo.username",
                    fullName: "$creatorInfo.fullName",
                    avatarUrl: "$creatorInfo.avatarUrl"
                },
                joinedAt: "$createdAt",
                communityCreatedAt: "$communityInfo.createdAt"
            }
        },
        {
            $sort: { joinedAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    const total = await CommunityMember.countDocuments({ user: userId });

    return res.status(200).json(
        new ApiResponse(200, {
            communities,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }, "User communities retrieved successfully")
    );
});

// Get all posts from communities user is member of
const getCommunityPosts = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get all communities user is member of
    const userCommunities = await CommunityMember.find({ user: userId }).select('community');
    const communityIds = userCommunities.map(cm => cm.community);

    if (communityIds.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, {
                posts: [],
                total: 0,
                page: parseInt(page),
                totalPages: 0
            }, "No communities found for user")
        );
    }

    // Get all users who are members of these communities
    const communityMembers = await CommunityMember.find({
        community: { $in: communityIds }
    }).select('user');

    const memberUserIds = [...new Set(communityMembers.map(cm => cm.user.toString()))];

    // Get original tweets from community members
    const tweets = await Tweet.aggregate([
        {
            $match: {
                author: { $in: memberUserIds.map(id => new mongoose.Types.ObjectId(id)) },
                isReply: false // Exclude replies to show only main posts
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "authorInfo"
            }
        },
        {
            $unwind: "$authorInfo"
        },
        {
            $lookup: {
                from: "communitymembers",
                localField: "author",
                foreignField: "user",
                as: "communityMemberships"
            }
        },
        {
            $addFields: {
                communities: {
                    $map: {
                        input: "$communityMemberships",
                        as: "membership",
                        in: "$$membership.community"
                    }
                }
            }
        },
        {
            $lookup: {
                from: "communities",
                localField: "communities",
                foreignField: "_id",
                as: "communityInfo"
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                media: 1,
                likesCount: 1,
                repliesCount: 1,
                retweetCount: 1,
                visibility: 1,
                pinned: 1,
                createdAt: 1,
                updatedAt: 1,
                author: {
                    _id: "$authorInfo._id",
                    username: "$authorInfo.username",
                    fullName: "$authorInfo.fullName",
                    avatarUrl: "$authorInfo.avatarUrl",
                    isVerified: "$authorInfo.isVerified"
                },
                communities: {
                    $map: {
                        input: "$communityInfo",
                        as: "community",
                        in: {
                            _id: "$$community._id",
                            name: "$$community.name",
                            slug: "$$community.slug"
                        }
                    }
                },
                type: "tweet"
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

    // Get retweets from community members
    const retweets = await Retweet.aggregate([
        {
            $match: {
                user: { $in: memberUserIds.map(id => new mongoose.Types.ObjectId(id)) }
            }
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweetInfo"
            }
        },
        {
            $unwind: "$tweetInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "retweeterInfo"
            }
        },
        {
            $unwind: "$retweeterInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "tweetInfo.author",
                foreignField: "_id",
                as: "originalAuthorInfo"
            }
        },
        {
            $unwind: "$originalAuthorInfo"
        },
        {
            $lookup: {
                from: "communitymembers",
                localField: "user",
                foreignField: "user",
                as: "communityMemberships"
            }
        },
        {
            $addFields: {
                communities: {
                    $map: {
                        input: "$communityMemberships",
                        as: "membership",
                        in: "$$membership.community"
                    }
                }
            }
        },
        {
            $lookup: {
                from: "communities",
                localField: "communities",
                foreignField: "_id",
                as: "communityInfo"
            }
        },
        {
            $project: {
                _id: 1,
                content: "$comment", // Quote tweet content
                originalTweet: {
                    _id: "$tweetInfo._id",
                    content: "$tweetInfo.content",
                    media: "$tweetInfo.media",
                    likesCount: "$tweetInfo.likesCount",
                    repliesCount: "$tweetInfo.repliesCount",
                    retweetCount: "$tweetInfo.retweetCount",
                    createdAt: "$tweetInfo.createdAt",
                    author: {
                        _id: "$originalAuthorInfo._id",
                        username: "$originalAuthorInfo.username",
                        fullName: "$originalAuthorInfo.fullName",
                        avatarUrl: "$originalAuthorInfo.avatarUrl",
                        isVerified: "$originalAuthorInfo.isVerified"
                    }
                },
                retweetedBy: {
                    _id: "$retweeterInfo._id",
                    username: "$retweeterInfo.username",
                    fullName: "$retweeterInfo.fullName",
                    avatarUrl: "$retweeterInfo.avatarUrl",
                    isVerified: "$retweeterInfo.isVerified"
                },
                communities: {
                    $map: {
                        input: "$communityInfo",
                        as: "community",
                        in: {
                            _id: "$$community._id",
                            name: "$$community.name",
                            slug: "$$community.slug"
                        }
                    }
                },
                createdAt: 1,
                type: "$comment" ? "quote_retweet" : "retweet"
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

    // Combine and sort all posts by creation date
    const allPosts = [...tweets, ...retweets].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, limit);

    // Get total count for pagination
    const totalTweets = await Tweet.countDocuments({
        author: { $in: memberUserIds },
        isReply: false
    });

    const totalRetweets = await Retweet.countDocuments({
        user: { $in: memberUserIds }
    });

    const total = totalTweets + totalRetweets;

    return res.status(200).json(
        new ApiResponse(200, {
            posts: allPosts,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }, "Community posts retrieved successfully")
    );
});

// Get posts from specific community
const getCommunitySpecificPosts = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user is member of the community
    const isMember = await CommunityMember.findOne({
        community: communityId,
        user: userId
    });

    if (!isMember) {
        throw new ApiError(403, "You must be a member of this community to view its posts");
    }

    // Get all users who are members of this community
    const communityMembers = await CommunityMember.find({
        community: communityId
    }).select('user');

    const memberUserIds = communityMembers.map(cm => cm.user);

    // Get tweets from community members
    const tweets = await Tweet.aggregate([
        {
            $match: {
                author: { $in: memberUserIds },
                isReply: false
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "authorInfo"
            }
        },
        {
            $unwind: "$authorInfo"
        },
        {
            $project: {
                _id: 1,
                content: 1,
                media: 1,
                likesCount: 1,
                repliesCount: 1,
                retweetCount: 1,
                visibility: 1,
                pinned: 1,
                createdAt: 1,
                updatedAt: 1,
                author: {
                    _id: "$authorInfo._id",
                    username: "$authorInfo.username",
                    fullName: "$authorInfo.fullName",
                    avatarUrl: "$authorInfo.avatarUrl",
                    isVerified: "$authorInfo.isVerified"
                },
                type: "tweet"
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

    // Get retweets from community members
    const retweets = await Retweet.aggregate([
        {
            $match: {
                user: { $in: memberUserIds }
            }
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweetInfo"
            }
        },
        {
            $unwind: "$tweetInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "retweeterInfo"
            }
        },
        {
            $unwind: "$retweeterInfo"
        },
        {
            $lookup: {
                from: "users",
                localField: "tweetInfo.author",
                foreignField: "_id",
                as: "originalAuthorInfo"
            }
        },
        {
            $unwind: "$originalAuthorInfo"
        },
        {
            $project: {
                _id: 1,
                content: "$comment",
                originalTweet: {
                    _id: "$tweetInfo._id",
                    content: "$tweetInfo.content",
                    media: "$tweetInfo.media",
                    likesCount: "$tweetInfo.likesCount",
                    repliesCount: "$tweetInfo.repliesCount",
                    retweetCount: "$tweetInfo.retweetCount",
                    createdAt: "$tweetInfo.createdAt",
                    author: {
                        _id: "$originalAuthorInfo._id",
                        username: "$originalAuthorInfo.username",
                        fullName: "$originalAuthorInfo.fullName",
                        avatarUrl: "$originalAuthorInfo.avatarUrl",
                        isVerified: "$originalAuthorInfo.isVerified"
                    }
                },
                retweetedBy: {
                    _id: "$retweeterInfo._id",
                    username: "$retweeterInfo.username",
                    fullName: "$retweeterInfo.fullName",
                    avatarUrl: "$retweeterInfo.avatarUrl",
                    isVerified: "$retweeterInfo.isVerified"
                },
                createdAt: 1,
                type: "$comment" ? "quote_retweet" : "retweet"
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

    // Combine posts
    const allPosts = [...tweets, ...retweets].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, limit);

    // Get total counts
    const totalTweets = await Tweet.countDocuments({
        author: { $in: memberUserIds },
        isReply: false
    });

    const totalRetweets = await Retweet.countDocuments({
        user: { $in: memberUserIds }
    });

    const total = totalTweets + totalRetweets;

    return res.status(200).json(
        new ApiResponse(200, {
            posts: allPosts,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            communityId
        }, "Community specific posts retrieved successfully")
    );
});

export {
    createCommunity,
    getAllCommunities,
    getCommunity,
    updateCommunity,
    deleteCommunity,
    getUserCommunities,
    getCommunityPosts,
    getCommunitySpecificPosts
};