import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model, Types } = mongoose;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
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
    // for account security
    isLocked: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    // optional: OAuth provider data
    oauth: {
        provider: String,
        providerId: String,
    }
}, { timestamps: true });


// password hash
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});


UserSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

export const User = model('User', UserSchema);