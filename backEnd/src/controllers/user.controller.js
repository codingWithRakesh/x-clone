import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { generateOTP } from "../utils/OTPGenrate.js"
import { sendVerificationEmail, sendWelcomeEmail } from "../utils/emailSend.js"
import bcrypt from 'bcrypt';
import { generateUserName, checkAvailableUsernames } from "../utils/genrateUserName.js"
import sharp from "sharp";
import { uploadOnCloudinary, deleteFromCloudinary, getPublicId } from "../utils/cloudinary.js"
import { accessAndRefreshTokenGenrator } from "../utils/token.js"
import { options } from "../constants.js"
import { LOCK_TIME, MAX_LOGIN_ATTEMPTS } from "../constants.js"
import { MAX_OTP_REQUESTS, OTP_BLOCK_TIME } from "../constants.js"

const registerUser = asyncHandler(async (req, res, next) => {
    const { email, fullName, dateOfBirth } = req.body

    if (!email || !fullName || !dateOfBirth || !dateOfBirth.date || !dateOfBirth.month || !dateOfBirth.year) {
        throw new ApiError(400, "Email, Full Name and Date of Birth are required.")
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
        throw new ApiError(409, "Email is already registered. Please login or use a different email.")
    }

    const { otp, expire } = generateOTP(6)
    if (!otp || !expire) {
        throw new ApiError(500, "Failed to generate OTP. Please try again.")
    }

    const hashedOTP = await bcrypt.hash(otp, 10);

    const user = await User.create({
        email: email.toLowerCase(),
        fullName: fullName.trim(),
        dateOfBirth: {
            date: dateOfBirth.date,
            month: dateOfBirth.month,
            year: dateOfBirth.year
        },
        OTP: {
            code: hashedOTP,
            expiresAt: expire,
            otpRequests: 1,
            lastOtpRequestAt: new Date(),
        }
    })

    if (!user) {
        throw new ApiError(500, "Failed to create user. Please try again.")
    }

    const usernames = await generateUserName(user.fullName, user.email)
    if(!usernames || usernames.length === 0){
        throw new ApiError(500, "Failed to generate default username. Please try again.")
    }

    const defaultUsername = usernames[0];
    user.username = defaultUsername;
    await user.save({ validateBeforeSave: false });

    const emailSend = await sendVerificationEmail(user.email, otp)
    if (!emailSend) {
        throw new ApiError(500, "Failed to send verification email. Please try again.")
    }

    return res.status(201).json(new ApiResponse(201, { userId: user._id }, "User registered successfully. Please verify your email."))
})

const reSendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+OTP")
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (user.OTP.otpBlockedUntil && user.OTP.otpBlockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.OTP.otpBlockedUntil - new Date()) / 1000 / 60);
        throw new ApiError(429, `Too many OTP requests. Please try again after ${remainingTime} minutes.`)
    }

    if (user.OTP.otpBlockedUntil && user.OTP.otpBlockedUntil <= new Date()) {
        user.OTP.otpRequests = 0;
        user.OTP.otpBlockedUntil = undefined;
    }

    if (user.OTP.otpRequests >= MAX_OTP_REQUESTS) {
        user.OTP.otpBlockedUntil = new Date(Date.now() + OTP_BLOCK_TIME);
        await user.save({ validateBeforeSave: false });
        
        const remainingTime = Math.ceil(OTP_BLOCK_TIME / 1000 / 60);
        throw new ApiError(429, `Too many OTP requests. Please try again after ${remainingTime} minutes.`)
    }

    const { otp, expire } = generateOTP(6)
    if (!otp || !expire) {
        throw new ApiError(500, "Failed to generate OTP. Please try again.")
    }

    const hashedOTP = await bcrypt.hash(otp, 10);

    user.OTP.code = hashedOTP;
    user.OTP.expiresAt = expire;
    user.OTP.otpRequests += 1;
    user.OTP.lastOtpRequestAt = new Date();

    await user.save({ validateBeforeSave: false });

    const emailSend = await sendVerificationEmail(user.email, otp)
    if (!emailSend) {
        throw new ApiError(500, "Failed to send verification email. Please try again.")
    }

    const remainingAttempts = MAX_OTP_REQUESTS - user.OTP.otpRequests;
    return res.status(200).json(
        new ApiResponse(200, { remainingAttempts }, "OTP resent successfully. Please check your email.")
    )
})

const verifyOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+OTP")
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.OTP || !user.OTP.code || !user.OTP.expiresAt) {
        throw new ApiError(400, "No OTP found for this user. Please request a new one.")
    }

    if (new Date() > user.OTP.expiresAt) {
        throw new ApiError(400, "OTP has expired. Please request a new one.")
    }

    const ok = await bcrypt.compare(otp, user.OTP.code);
    if (!ok) {
        throw new ApiError(400, "Invalid OTP. Please try again.")
    }

    user.isVerified = true
    user.OTP.code = undefined
    user.OTP.expiresAt = undefined
    user.OTP.otpRequests = 0

    await user.save({ validateBeforeSave: false });

    await sendWelcomeEmail(user.email, user.fullName);

    const { accessToken, refreshToken } = await accessAndRefreshTokenGenrator(user._id, User)

    if(!accessToken || !refreshToken){
        throw new ApiError(500, "Failed to generate authentication tokens. Please try logging in.")
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {user, accessToken, refreshToken}, "Email verified successfully. You can now log in."))

})

const setPassword = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body
    if (!email || !password) {
        throw new ApiError(400, "Email and Password are required.")
    }

    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long.")
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.isVerified) {
        throw new ApiError(400, "Email is not verified. Please verify your email before setting a password.")
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, null, "Password set successfully. You can now log in."))
})

const sendDefaultUserName = asyncHandler(async (req, res, next) => {
    const { email } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.isVerified) {
        throw new ApiError(400, "Email is not verified. Please verify your email before setting a username.")
    }

    const usernames = await generateUserName(user.fullName, user.email)
    if (!usernames || usernames.length === 0) {
        throw new ApiError(500, "Failed to generate default username. Please try again.")
    }

    return res.status(200).json(new ApiResponse(200, { usernames }, "Default username set successfully."))
})

const setUserName = asyncHandler(async (req, res, next) => {
    const { email, username } = req.body
    if (!email || !username) {
        throw new ApiError(400, "Email and Username are required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.isVerified) {
        throw new ApiError(400, "Email is not verified. Please verify your email before setting a username.")
    }

    const { available } = await checkAvailableUsernames(username.toLowerCase())
    if (!available) {
        throw new ApiError(409, "Username is already taken. Please choose a different one.")
    }

    user.username = username.toLowerCase()
    await user.save({ validateBeforeSave: false })
    return res.status(200).json(new ApiResponse(200, null, "Username set successfully."))
})

const bufferToBase64 = (buffer, mimetype) => `data:${mimetype};base64,${buffer.toString("base64")}`;
function calculateImageQuality(originalSize, targetSize) {
    const sizeRatio = targetSize / originalSize;
    let quality = Math.floor(70 * sizeRatio);
    return Math.max(10, Math.min(90, quality));
}
const setProfileImage = asyncHandler(async (req, res, next) => {
    const { email } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required.")
    }

    if (!req.file) {
        throw new ApiError(400, "Profile image file is required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.isVerified) {
        throw new ApiError(400, "Email is not verified. Please verify your email before setting a profile image.")
    }

    const { buffer, mimetype, size } = req.file;

    if (!buffer || !mimetype) throw new ApiError(400, "Invalid file");

    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    ];

    if (!allowedImageTypes.includes(mimetype)) {
        throw new ApiError(400, "Invalid file type. Please upload an image.")
    }

    const MAX_SIZES = 5 * 1024 * 1024

    let processedBuffer = buffer;
    let fileUrl;

    if (mimetype.startsWith('image/')) {
        if (size > MAX_SIZES.image) throw new ApiError(400, "Image size must be less than 5MB");

        const targetQuality = calculateImageQuality(size, 1 * 1024 * 1024);
        processedBuffer = await sharp(buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: targetQuality, progressive: true, optimiseScans: true })
            .toBuffer();

        const base64File = bufferToBase64(processedBuffer, mimetype);
        const result = await uploadOnCloudinary(base64File, "image");

        if (!result?.secure_url) throw new ApiError(500, "Cloudinary image upload failed");
        fileUrl = result.secure_url;
    }

    if (user.avatarUrl) {
        const publicId = getPublicId(user.avatarUrl);
        await deleteFromCloudinary(publicId);
    }else{
        user.avatarUrl = fileUrl;
        await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json(new ApiResponse(200, { avatarUrl: fileUrl }, "Avatar image updated successfully."));
})

const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body
    if(!email || !password){
        throw new ApiError(400, "Email and Password are required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password +refreshToken +loginAttempts +isLocked +lockUntil")
    if(!user){
        throw new ApiError(404, "User not found.")
    }

    if(!user.isVerified){
        throw new ApiError(400, "Email is not verified. Please verify your email before logging in.")
    }

    if (user.isLocked && user.lockUntil) {
        if (user.lockUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
            return res.status(403).json(
                new ApiResponse(403, null, `Account is locked due to too many failed attempts. Try again in ${remainingTime} minutes.`)
            );
        } else {
            user.isLocked = false;
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save({ validateBeforeSave: false });
        }
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if(!isPasswordMatch){
        user.loginAttempts += 1;

        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.isLocked = true;
            user.lockUntil = new Date(Date.now() + LOCK_TIME);
            
            await user.save({ validateBeforeSave: false });
            
            throw new ApiError(400, `Too many failed attempts. Account locked for ${LOCK_TIME / 1000 / 60} minutes.`)
        }

        await user.save({ validateBeforeSave: false });

        const remainingAttempts = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
        throw new ApiError(400, `Invalid password. ${remainingAttempts} attempt(s) remaining.`)
    }

    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();

    const { accessToken, refreshToken } = await accessAndRefreshTokenGenrator(user._id, User)

    if(!accessToken || !refreshToken){
        throw new ApiError(500, "Failed to generate authentication tokens. Please try logging in.")
    }

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {user, accessToken, refreshToken}, "Logged in successfully."))
})

const logoutUser = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 }
    },
        { new: true }
    )

    if (!user) {
        throw new ApiError(500, "Failed to logout. Please try again.")
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "Logged out successfully."))
})

const currentUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(404, "User not found.")
    }
    return res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully."))
})

const setBannerImage = asyncHandler(async (req, res, next) => {
    const { email } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required.")
    }

    if (!req.file) {
        throw new ApiError(400, "Banner image file is required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.isVerified) {
        throw new ApiError(400, "Email is not verified. Please verify your email before setting a profile image.")
    }

    const { buffer, mimetype, size } = req.file;

    if (!buffer || !mimetype) throw new ApiError(400, "Invalid file");

    const allowedImageTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    ];

    if (!allowedImageTypes.includes(mimetype)) {
        throw new ApiError(400, "Invalid file type. Please upload an image.")
    }

    const MAX_SIZES = 5 * 1024 * 1024

    let processedBuffer = buffer;
    let fileUrl;

    if (mimetype.startsWith('image/')) {
        if (size > MAX_SIZES.image) throw new ApiError(400, "Image size must be less than 5MB");

        const targetQuality = calculateImageQuality(size, 1 * 1024 * 1024);
        processedBuffer = await sharp(buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: targetQuality, progressive: true, optimiseScans: true })
            .toBuffer();

        const base64File = bufferToBase64(processedBuffer, mimetype);
        const result = await uploadOnCloudinary(base64File, "image");

        if (!result?.secure_url) throw new ApiError(500, "Cloudinary image upload failed");
        fileUrl = result.secure_url;
    }

    if (user.bannerUrl) {
        const publicId = getPublicId(user.bannerUrl);
        await deleteFromCloudinary(publicId);
    }else{
        user.bannerUrl = fileUrl;
        await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json(new ApiResponse(200, { bannerUrl: fileUrl }, "Banner image updated successfully."));
})

const updateProfile = asyncHandler(async (req, res, next) => {
    const { email, fullName, bio, location, website } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required.")
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (!user.isVerified) {
        throw new ApiError(400, "Email is not verified. Please verify your email before updating profile.")
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, {
        fullName: fullName || user.fullName,
        bio: bio || user.bio,
        location: location || user.location,
        website: website || user.website,
    }, { new: true })

    if (!updatedUser) {
        throw new ApiError(500, "Failed to update profile. Please try again.")
    }

    return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully."))
})

export {
    registerUser,
    reSendOTP,
    verifyOTP,
    setPassword,
    sendDefaultUserName,
    setUserName,
    setProfileImage,
    loginUser,
    logoutUser,
    currentUser,
    setBannerImage,
    updateProfile
}