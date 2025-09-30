import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { uploadOnCloudinary, deleteFromCloudinary, getPublicId } from "../utils/cloudinary.js"
import sharp from "sharp";
import mongoose from "mongoose";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";

const bufferToBase64 = (buffer, mimetype) => {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
};

const calculateImageQuality = (fileSize, maxSize) => {
    if (fileSize <= maxSize * 0.5) return 85;
    if (fileSize <= maxSize * 0.8) return 75;
    return 65;
};

const createTweet = asyncHandler(async (req, res, next) => {
    const { content, replyTo, quoteOf, visibility = 'public' } = req.body;
    const author = req.user._id;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required");
    }

    if (content && content.length > 280) {
        throw new ApiError(400, "Tweet content cannot exceed 280 characters");
    }

    if (req.files && req.files.length > 4) {
        throw new ApiError(400, "You can upload a maximum of 4 images per tweet");
    }

    const MAX_SIZES = {
        image: 5 * 1024 * 1024, // 5MB
        video: 10 * 1024 * 1024, // 10MB
        gif: 5 * 1024 * 1024 // 5MB
    };

    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    ];

    const allowedVideoTypes = [
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];

    const mediaUrls = [];

    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            const { buffer, mimetype, size } = file;

            if (!buffer || !mimetype) {
                throw new ApiError(400, "Invalid file");
            }

            if (!allowedImageTypes.includes(mimetype) && !allowedVideoTypes.includes(mimetype)) {
                throw new ApiError(400, "Invalid file type. Please upload an image or video.");
            }

            let processedBuffer = buffer;
            let fileUrl;

            if (mimetype.startsWith('image/') && !mimetype.includes('gif')) {
                if (size > MAX_SIZES.image) {
                    throw new ApiError(400, "Image size must be less than 5MB");
                }

                const targetQuality = calculateImageQuality(size, 1 * 1024 * 1024);
                processedBuffer = await sharp(buffer)
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

            } else if (mimetype.startsWith('video/')) {
                if (size > MAX_SIZES.video) {
                    throw new ApiError(400, "Video size must be less than 10MB");
                }

                const base64File = bufferToBase64(buffer, mimetype);
                const result = await uploadOnCloudinary(base64File, "video");

                if (!result?.secure_url) {
                    throw new ApiError(500, "Cloudinary video upload failed");
                }
                fileUrl = result.secure_url;
            }

            if (fileUrl) {
                mediaUrls.push(fileUrl);
            }
        }
    }

    const tweetData = {
        author: new mongoose.Types.ObjectId(author),
        content: content.trim(),
        media: mediaUrls || [],
        visibility
    };

    if (replyTo) {
        const parentTweet = await Tweet.findById(replyTo);
        if (!parentTweet) {
            throw new ApiError(404, "Parent tweet not found");
        }
        tweetData.replyTo = new mongoose.Types.ObjectId(replyTo);
        tweetData.isReply = true;

        await Tweet.findByIdAndUpdate(replyTo, { $inc: { repliesCount: 1 } });
    }

    if (quoteOf) {
        const quotedTweet = await Tweet.findById(quoteOf);
        if (!quotedTweet) {
            throw new ApiError(404, "Quoted tweet not found");
        }
        tweetData.quoteOf = new mongoose.Types.ObjectId(quoteOf);
        tweetData.isQuote = true;

        await Tweet.findByIdAndUpdate(quoteOf, { $inc: { retweetCount: 1 } });
    }

    const tweet = await Tweet.create(tweetData);

    const aggregatedTweet = await Tweet.aggregate([
        {
            $match: { _id: tweet._id }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'authorInfo',
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
            $unwind: '$authorInfo'
        },
        {
            $lookup: {
                from: 'tweets',
                localField: 'replyTo',
                foreignField: '_id',
                as: 'replyToData',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorInfo',
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
                        $unwind: '$authorInfo'
                    },
                    {
                        $project: {
                            content: 1,
                            media: 1,
                            'authorInfo.username': 1,
                            'authorInfo.fullName': 1,
                            'authorInfo.avatarUrl': 1,
                            'authorInfo.isVerified': 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: '$replyToData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'tweets',
                localField: 'quoteOf',
                foreignField: '_id',
                as: 'quoteOfData',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorInfo',
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
                        $unwind: '$authorInfo'
                    },
                    {
                        $project: {
                            content: 1,
                            media: 1,
                            'authorInfo.username': 1,
                            'authorInfo.fullName': 1,
                            'authorInfo.avatarUrl': 1,
                            'authorInfo.isVerified': 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: '$quoteOfData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                content: 1,
                media: 1,
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
                author: '$authorInfo',
                replyToData: 1,
                quoteOfData: 1
            }
        }
    ]);

    if (!aggregatedTweet || aggregatedTweet.length === 0) {
        throw new ApiError(500, "Failed to create tweet");
    }

    return res.status(201).json(
        new ApiResponse(201, aggregatedTweet[0], "Tweet created successfully")
    );
});


const getTweetById = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const aggregatedTweet = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(tweetId)
            }
        },
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
                            isVerified: 1,
                            followersCount: 1,
                            followingCount: 1
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
                localField: 'replyTo',
                foreignField: '_id',
                as: 'replyTo',
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
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: '$replyTo',
                preserveNullAndEmptyArrays: true
            }
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
                            createdAt: 1,
                            visibility: 1
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
                        then: { $in: [new mongoose.Types.ObjectId(userId), "$likes"] },
                        else: false
                    }
                },
                isRetweeted: {
                    $cond: {
                        if: { $isArray: "$retweets" },
                        then: { $in: [new mongoose.Types.ObjectId(userId), "$retweets"] },
                        else: false
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
    ]);

    if (!aggregatedTweet || aggregatedTweet.length === 0) {
        throw new ApiError(404, "Tweet not found");
    }

    const tweet = aggregatedTweet[0];

    if (tweet.visibility === 'private' && tweet.author._id.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to view this tweet");
    }

    if (tweet.quoteOf && tweet.quoteOf.visibility === 'private' &&
        tweet.quoteOf.author._id.toString() !== userId.toString()) {
        tweet.quoteOf = null;
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet fetched successfully")
    );
});

const getUserTweets = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = req.user?._id;

    const skip = (page - 1) * limit;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                author: new mongoose.Types.ObjectId(userId),
                isReply: false
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
        },
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
                                new mongoose.Types.ObjectId(currentUserId),
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
                                new mongoose.Types.ObjectId(currentUserId),
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
                                { $ne: ["$quoteOf.author._id", new mongoose.Types.ObjectId(currentUserId)] }
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
    ]);

    const totalTweets = await Tweet.countDocuments({
        author: userId,
        isReply: false
    });

    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalTweets / limit),
            totalTweets,
            hasNextPage: (page * limit) < totalTweets,
            hasPrevPage: page > 1
        }, "User tweets fetched successfully")
    );
});

const getTimeline = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const skip = (page - 1) * limit;

    const followingUsers = await Follow.find({ follower: userId })
        .select('following')
        .lean();

    const followingIds = followingUsers.map(follow => follow.following);
    
    const allUserIds = [...followingIds, new mongoose.Types.ObjectId(userId)];

    const tweets = await Tweet.aggregate([
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { author: { $in: allUserIds } },
                            { visibility: 'public' } 
                        ]
                    },
                    { isReply: false } 
                ]
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
        },
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
                            isVerified: 1,
                            followersCount: 1
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
                },
                isFollowingAuthor: {
                    $in: [
                        "$author._id",
                        allUserIds 
                    ]
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
                                { 
                                    $not: {
                                        $in: [
                                            "$quoteOf.author._id",
                                            allUserIds
                                        ]
                                    }
                                }
                            ]
                        },
                        then: null,
                        else: "$quoteOf"
                    }
                }
            }
        },
        {
            $match: {
                $or: [
                    { visibility: { $in: ['public', 'protected'] } },
                    { 
                        $and: [
                            { visibility: 'private' },
                            { 
                                $in: [
                                    "$author._id",
                                    allUserIds
                                ]
                            }
                        ]
                    }
                ]
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
                isRetweeted: 1,
                isFollowingAuthor: 1
            }
        }
    ]);

    const totalTweets = await Tweet.aggregate([
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { author: { $in: allUserIds } },
                            { visibility: 'public' }
                        ]
                    },
                    { isReply: false }
                ]
            }
        },
        {
            $match: {
                $or: [
                    { visibility: { $in: ['public', 'protected'] } },
                    { 
                        $and: [
                            { visibility: 'private' },
                            { 
                                author: { $in: allUserIds }
                            }
                        ]
                    }
                ]
            }
        },
        {
            $count: "total"
        }
    ]);

    const totalCount = totalTweets.length > 0 ? totalTweets[0].total : 0;

    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalTweets: totalCount,
            hasNextPage: (page * limit) < totalCount,
            hasPrevPage: page > 1
        }, "Timeline fetched successfully")
    );
});

const updateTweet = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const { content, visibility } = req.body;
    const userId = req.user._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.author.toString() !== userId.toString()) {
        throw new ApiError(403, "You can only edit your own tweets");
    }

    if (tweet.isReply || tweet.isQuote) {
        throw new ApiError(400, "Cannot edit reply or quote tweets");
    }

    if (content !== undefined) {
        if (content.length > 280) {
            throw new ApiError(400, "Tweet content cannot exceed 280 characters");
        }
        if (content.trim() === "") {
            throw new ApiError(400, "Tweet content cannot be empty");
        }
    }

    const MAX_SIZES = {
        image: 5 * 1024 * 1024, // 5MB
        video: 10 * 1024 * 1024, // 10MB
        gif: 5 * 1024 * 1024 // 5MB
    };

    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    ];

    const allowedVideoTypes = [
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];

    let mediaUrls = tweet.media || [];

    if (req.files && req.files.length > 0) {
        if (tweet.media && tweet.media.length > 0) {
            for (const mediaUrl of tweet.media) {
                const publicId = getPublicId(mediaUrl);
                await deleteFromCloudinary(publicId);
            }
        }

        mediaUrls = [];

        if (req.files.length > 4) {
            throw new ApiError(400, "You can upload a maximum of 4 images per tweet");
        }

        for (const file of req.files) {
            const { buffer, mimetype, size } = file;

            if (!buffer || !mimetype) {
                throw new ApiError(400, "Invalid file");
            }

            if (!allowedImageTypes.includes(mimetype) && !allowedVideoTypes.includes(mimetype)) {
                throw new ApiError(400, "Invalid file type. Please upload an image or video.");
            }

            let processedBuffer = buffer;
            let fileUrl;

            if (mimetype.startsWith('image/') && !mimetype.includes('gif')) {
                if (size > MAX_SIZES.image) {
                    throw new ApiError(400, "Image size must be less than 5MB");
                }

                const targetQuality = calculateImageQuality(size, 1 * 1024 * 1024);
                processedBuffer = await sharp(buffer)
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

            } else if (mimetype.startsWith('video/')) {
                if (size > MAX_SIZES.video) {
                    throw new ApiError(400, "Video size must be less than 10MB");
                }

                const base64File = bufferToBase64(buffer, mimetype);
                const result = await uploadOnCloudinary(base64File, "video");

                if (!result?.secure_url) {
                    throw new ApiError(500, "Cloudinary video upload failed");
                }
                fileUrl = result.secure_url;
            }

            if (fileUrl) {
                mediaUrls.push(fileUrl);
            }
        }
    }

    const updateData = {};
    if (content !== undefined) updateData.content = content.trim();
    if (mediaUrls.length > 0) updateData.media = mediaUrls;
    if (visibility !== undefined) updateData.visibility = visibility;

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        updateData,
        { new: true, runValidators: true }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update tweet");
    }

    const aggregatedTweet = await Tweet.aggregate([
        {
            $match: { _id: updatedTweet._id }
        },
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
    ]);

    if (!aggregatedTweet || aggregatedTweet.length === 0) {
        throw new ApiError(500, "Failed to fetch updated tweet");
    }

    return res.status(200).json(
        new ApiResponse(200, aggregatedTweet[0], "Tweet updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweetData = await Tweet.aggregate([
        {
            $match: { 
                _id: new mongoose.Types.ObjectId(tweetId) 
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'authorInfo',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: '$authorInfo'
        },
        {
            $lookup: {
                from: 'tweets',
                localField: 'replyTo',
                foreignField: '_id',
                as: 'replyToData',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            author: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: '$replyToData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'tweets',
                localField: 'quoteOf',
                foreignField: '_id',
                as: 'quoteOfData',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            author: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: '$quoteOfData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                author: '$authorInfo',
                media: 1,
                isReply: 1,
                isQuote: 1,
                replyTo: 1,
                quoteOf: 1,
                replyToData: 1,
                quoteOfData: 1
            }
        }
    ]);

    if (!tweetData || tweetData.length === 0) {
        throw new ApiError(404, "Tweet not found");
    }

    const tweet = tweetData[0];

    if (tweet.author._id.toString() !== userId.toString()) {
        throw new ApiError(403, "You can only delete your own tweets");
    }

    if (tweet.media && tweet.media.length > 0) {
        for (const mediaUrl of tweet.media) {
            try {
                const publicId = getPublicId(mediaUrl);
                await deleteFromCloudinary(publicId);
            } catch (error) {
                console.error("Failed to delete media from Cloudinary:", error);
            }
        }
    }

    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            if (tweet.isReply && tweet.replyToData) {
                await Tweet.findByIdAndUpdate(
                    tweet.replyTo, 
                    { $inc: { repliesCount: -1 } },
                    { session }
                );
            }

            if (tweet.isQuote && tweet.quoteOfData) {
                await Tweet.findByIdAndUpdate(
                    tweet.quoteOf, 
                    { $inc: { retweetCount: -1 } },
                    { session }
                );
            }

            await Tweet.findByIdAndDelete(tweetId, { session });

            await User.findByIdAndUpdate(
                userId,
                { $inc: { tweetsCount: -1 } },
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Tweet deleted successfully")
    );
});

const getTweetReplies = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const skip = (page - 1) * limit;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const parentTweet = await Tweet.aggregate([
        {
            $match: { 
                _id: new mongoose.Types.ObjectId(tweetId) 
            }
        },
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
    ]);

    if (!parentTweet || parentTweet.length === 0) {
        throw new ApiError(404, "Tweet not found");
    }

    const parentTweetData = parentTweet[0];
    if (parentTweetData.visibility === 'private' && 
        parentTweetData.author._id.toString() !== userId?.toString()) {
        throw new ApiError(403, "You don't have permission to view replies of this tweet");
    }

    const replies = await Tweet.aggregate([
        {
            $match: { 
                replyTo: new mongoose.Types.ObjectId(tweetId) 
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
        },
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
                            isVerified: 1,
                            followersCount: 1
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
    ]);

    const totalRepliesAggregation = await Tweet.aggregate([
        {
            $match: { 
                replyTo: new mongoose.Types.ObjectId(tweetId) 
            }
        },
        {
            $count: "total"
        }
    ]);

    const totalReplies = totalRepliesAggregation.length > 0 ? totalRepliesAggregation[0].total : 0;

    return res.status(200).json(
        new ApiResponse(200, {
            replies,
            parentTweet: parentTweetData,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalReplies / limit),
            totalReplies,
            hasNextPage: (page * limit) < totalReplies,
            hasPrevPage: page > 1
        }, "Tweet replies fetched successfully")
    );
});

const toggleTweetPin = asyncHandler(async (req, res, next) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet.author.toString() !== userId.toString()) {
        throw new ApiError(403, "You can only pin your own tweets");
    }

    tweet.pinned = !tweet.pinned;
    await tweet.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, tweet, `Tweet ${tweet.pinned ? "pinned" : "unpinned"} successfully`)
    );
});

const searchTweets = asyncHandler(async (req, res, next) => {
    const { q, page = 1, limit = 10 } = req.query;
    const userId = req.user?._id;

    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (!q || q.trim() === "") {
        throw new ApiError(400, "Search query is required");
    }

    const skip = (page - 1) * limit;
    const searchQuery = q.trim();

    const tweets = await Tweet.aggregate([
        {
            $match: {
                $text: { $search: searchQuery },
                isReply: false,
                $or: [
                    { visibility: 'public' },
                    { 
                        $and: [
                            { visibility: 'private' },
                            { author: new mongoose.Types.ObjectId(userId) }
                        ]
                    }
                ]
            }
        },
        {
            $sort: { 
                score: { $meta: "textScore" },
                createdAt: -1 
            }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        },
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
                            isVerified: 1,
                            followersCount: 1
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
                },
                searchScore: { $meta: "textScore" }
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
                isRetweeted: 1,
                searchScore: 1
            }
        }
    ]);

    const totalTweetsAggregation = await Tweet.aggregate([
        {
            $match: {
                $text: { $search: searchQuery },
                isReply: false,
                $or: [
                    { visibility: 'public' },
                    { 
                        $and: [
                            { visibility: 'private' },
                            { author: new mongoose.Types.ObjectId(userId) }
                        ]
                    }
                ]
            }
        },
        {
            $count: "total"
        }
    ]);

    const totalTweets = totalTweetsAggregation.length > 0 ? totalTweetsAggregation[0].total : 0;

    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalTweets / limit),
            totalTweets,
            searchQuery: searchQuery,
            hasNextPage: (page * limit) < totalTweets,
            hasPrevPage: page > 1
        }, "Tweets search completed successfully")
    );
});

export {
    createTweet,
    getTweetById,
    getUserTweets,
    getTimeline,
    updateTweet,
    deleteTweet,
    getTweetReplies,
    toggleTweetPin,
    searchTweets
};