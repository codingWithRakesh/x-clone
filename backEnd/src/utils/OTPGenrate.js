function generateOTP(length) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    const expire = Date.now() + 10 * 60 * 1000
    return { otp, expire };
}
export { generateOTP };