import { ApiError } from "./apiError.js"
import jwt from 'jsonwebtoken';

const accessAndRefreshTokenGenrator = async (userId, User) => {
    try {
        const user = await User.findById(userId)
        const accessToken = jwt.sign({
            _id : user._id,
            email : user.email,
            fullName : user.fullName,
        },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn : process.env.ACCESS_TOKEN_EXPIRY
            }
        )
        const refreshToken = jwt.sign({
            _id : user._id,
            email : user.email,
        },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn : process.env.REFRESH_TOKEN_EXPIRY
            }
        )

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}

export { accessAndRefreshTokenGenrator }