export const DB_NAME = "XClone"
export const options = {
    httpOnly: true,
    secure: true,
    sameSite: 'None'
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_TIME = 30 * 60 * 1000 // 30 minutes

export const MAX_OTP_REQUESTS = 5;
export const OTP_BLOCK_TIME = 30 * 60 * 1000; // 30 minutes