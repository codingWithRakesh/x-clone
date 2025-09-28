import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const { Schema, model, Types } = mongoose;

const UserSchema = new Schema({
    username: { type: String, unique: true, trim: true, lowercase: true, index: true },
    fullName : { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    refreshToken : { type: String, select: false },
    bio: { type: String, default: '' },
    location: { type: String },
    website: { type: String },
    avatarUrl: { type: String },
    bannerUrl: { type: String },
    isVerified: { type: Boolean, default: false },
    roles: { type: [String], default: ['user'] },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    tweetsCount: { type: Number, default: 0 },
    dateOfBirth : { 
        date : { type: Number, min: 1, max: 31 },
        month : { type: String, enum: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ] },
        year : { type: Number, min: 1900, max: new Date().getFullYear() }
    },
    OTP : {
        code : { type: String },
        expiresAt : { type: Date },
        otpRequests : { type: Number, default: 0 },
        lastOtpRequestAt: { type: Date },
        otpBlockedUntil: { type: Date },
    },
    // for account security
    isLocked: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
    // optional: OAuth provider data
    oauth: {
        provider: String,
        providerId: String,
    }
}, { timestamps: true });


export const User = model('User', UserSchema);