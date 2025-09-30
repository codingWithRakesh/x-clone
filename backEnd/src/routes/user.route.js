import { Router } from "express";
import {
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
} from "../controllers/user.controller.js"
import { verifyLogin } from "../middlewares/oauth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/resend-otp").post(reSendOTP)
router.route("/verify-otp").post(verifyOTP)
router.route("/set-password").post(verifyLogin, setPassword)
router.route("/send-default-username").post(verifyLogin, sendDefaultUserName)
router.route("/set-username").post(verifyLogin, setUserName)
router.route("/set-profile-image").post(verifyLogin, upload.single("profileImage"), setProfileImage)

router.route("/login").post(loginUser)
router.route("/logout").get(verifyLogin, logoutUser)
router.route("/current-user").get(verifyLogin, currentUser)
router.route("/set-banner-image").post(verifyLogin, upload.single("bannerImage"), setBannerImage)
router.route("/update-profile").put(verifyLogin, updateProfile)

export default router