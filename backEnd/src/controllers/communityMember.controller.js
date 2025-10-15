import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { CommunityMember } from "../models/communityMember.model.js";
import { Community } from "../models/community.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Join community
const joinCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    // Check if community exists
    const community = await Community.findById(communityId);
    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    // Check if already a member
    const existingMember = await CommunityMember.findOne({
        community: communityId,
        user: userId
    });

    if (existingMember) {
        throw new ApiError(400, "You are already a member of this community");
    }

    // Create membership
    const member = await CommunityMember.create({
        community: communityId,
        user: userId,
        role: 'member'
    });

    // Update members count
    await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: 1 } });

    const memberWithDetails = await CommunityMember.aggregate([
        {
            $match: { _id: member._id }
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
                localField: "user",
                foreignField: "_id",
                as: "userInfo"
            }
        },
        {
            $unwind: "$userInfo"
        },
        {
            $project: {
                _id: 1,
                role: 1,
                community: {
                    _id: "$communityInfo._id",
                    name: "$communityInfo.name",
                    slug: "$communityInfo.slug",
                    description: "$communityInfo.description",
                    isPrivate: "$communityInfo.isPrivate",
                    membersCount: "$communityInfo.membersCount"
                },
                user: {
                    _id: "$userInfo._id",
                    username: "$userInfo.username",
                    fullName: "$userInfo.fullName",
                    avatarUrl: "$userInfo.avatarUrl"
                },
                joinedAt: "$createdAt",
                updatedAt: 1
            }
        }
    ]);

    return res.status(201).json(
        new ApiResponse(201, memberWithDetails[0], "Joined community successfully")
    );
});

// Leave community
const leaveCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    // Check if member exists
    const member = await CommunityMember.findOne({
        community: communityId,
        user: userId
    });

    if (!member) {
        throw new ApiError(404, "You are not a member of this community");
    }

    // Prevent admin from leaving (they should transfer admin role first or delete community)
    if (member.role === 'admin') {
        throw new ApiError(400, "Admins cannot leave the community. Transfer admin role first or delete the community.");
    }

    // Delete membership
    await CommunityMember.findByIdAndDelete(member._id);

    // Update members count
    await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: -1 } });

    return res.status(200).json(
        new ApiResponse(200, null, "Left community successfully")
    );
});

// Get community members
const getCommunityMembers = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const { page = 1, limit = 10, role } = req.query;
    const skip = (page - 1) * limit;

    const matchStage = { community: new mongoose.Types.ObjectId(communityId) };
    if (role) {
        matchStage.role = role;
    }

    const members = await CommunityMember.aggregate([
        {
            $match: matchStage
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userInfo"
            }
        },
        {
            $unwind: "$userInfo"
        },
        {
            $project: {
                _id: 1,
                role: 1,
                user: {
                    _id: "$userInfo._id",
                    username: "$userInfo.username",
                    fullName: "$userInfo.fullName",
                    avatarUrl: "$userInfo.avatarUrl",
                    isVerified: "$userInfo.isVerified",
                    bio: "$userInfo.bio"
                },
                joinedAt: "$createdAt",
                updatedAt: 1
            }
        },
        {
            $sort: { 
                role: 1, // Sort by role (admin first, then moderator, then member)
                joinedAt: 1 
            }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    const total = await CommunityMember.countDocuments(matchStage);

    return res.status(200).json(
        new ApiResponse(200, {
            members,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }, "Community members retrieved successfully")
    );
});

// Update member role
const updateMemberRole = asyncHandler(async (req, res) => {
    const { communityId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user._id;

    if (!['member', 'moderator', 'admin'].includes(role)) {
        throw new ApiError(400, "Invalid role");
    }

    // Check if requester is admin
    const requester = await CommunityMember.findOne({
        community: communityId,
        user: userId
    });

    if (!requester || requester.role !== 'admin') {
        throw new ApiError(403, "Only community admins can update member roles");
    }

    // Update member role
    const member = await CommunityMember.findOneAndUpdate(
        { _id: memberId, community: communityId },
        { role },
        { new: true }
    );

    if (!member) {
        throw new ApiError(404, "Member not found");
    }

    const memberWithDetails = await CommunityMember.aggregate([
        {
            $match: { _id: member._id }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userInfo"
            }
        },
        {
            $unwind: "$userInfo"
        },
        {
            $project: {
                _id: 1,
                role: 1,
                user: {
                    _id: "$userInfo._id",
                    username: "$userInfo.username",
                    fullName: "$userInfo.fullName",
                    avatarUrl: "$userInfo.avatarUrl"
                },
                joinedAt: "$createdAt",
                updatedAt: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, memberWithDetails[0], "Member role updated successfully")
    );
});

// Remove member from community
const removeMember = asyncHandler(async (req, res) => {
    const { communityId, memberId } = req.params;
    const userId = req.user._id;

    // Check if requester is admin or moderator
    const requester = await CommunityMember.findOne({
        community: communityId,
        user: userId
    });

    if (!requester || (requester.role !== 'admin' && requester.role !== 'moderator')) {
        throw new ApiError(403, "Only admins and moderators can remove members");
    }

    // Prevent removing admins (only admins can remove other admins)
    const targetMember = await CommunityMember.findById(memberId);
    if (targetMember.role === 'admin' && requester.role !== 'admin') {
        throw new ApiError(403, "Only admins can remove other admins");
    }

    // Prevent self-removal for admins
    if (targetMember.user.toString() === userId.toString() && targetMember.role === 'admin') {
        throw new ApiError(400, "Admins cannot remove themselves. Transfer admin role first.");
    }

    // Remove member
    await CommunityMember.findByIdAndDelete(memberId);

    // Update members count
    await Community.findByIdAndUpdate(communityId, { $inc: { membersCount: -1 } });

    return res.status(200).json(
        new ApiResponse(200, null, "Member removed successfully")
    );
});

// Check if user is member of community
const checkMembership = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    const membership = await CommunityMember.findOne({
        community: communityId,
        user: userId
    });

    const isMember = !!membership;

    return res.status(200).json(
        new ApiResponse(200, {
            isMember,
            role: membership?.role || null,
            joinedAt: membership?.createdAt || null
        }, "Membership status retrieved successfully")
    );
});

// Get user's membership communities with pagination
const getUserMemberships = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const memberships = await CommunityMember.aggregate([
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
            $project: {
                _id: 1,
                role: 1,
                community: {
                    _id: "$communityInfo._id",
                    name: "$communityInfo.name",
                    slug: "$communityInfo.slug",
                    description: "$communityInfo.description",
                    isPrivate: "$communityInfo.isPrivate",
                    membersCount: "$communityInfo.membersCount",
                    createdAt: "$communityInfo.createdAt"
                },
                joinedAt: "$createdAt"
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
            memberships,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        }, "User memberships retrieved successfully")
    );
});

export {
    joinCommunity,
    leaveCommunity,
    getCommunityMembers,
    updateMemberRole,
    removeMember,
    checkMembership,
    getUserMemberships
};