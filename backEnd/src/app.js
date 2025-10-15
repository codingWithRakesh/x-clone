import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://127.0.0.1:5502",
    credentials: true
}))
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.route.js"
import tweetRouter from "./routes/tweet.route.js"
import reTweetRouter from "./routes/reTweet.route.js"
import likeRouter from "./routes/like.route.js"
import followRouter from "./routes/follow.route.js"
import communityRouter from "./routes/community.route.js"
// import communityMemberRouter from "./routes/communityMember.route.js"
import bookmarkRouter from "./routes/bookmark.route.js"
import messageRouter from "./routes/message.route.js"
// import grockMessageRouter from "./routes/grockMessage.route.js"
// import grockConversationRouter from "./routes/grockConversation.route.js"
import notificationRouter from "./routes/notification.route.js"

app.use("/api/v1/user", userRouter)
app.use("/api/v1/tweet", tweetRouter)
app.use("/api/v1/reTweet", reTweetRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/follow", followRouter)
app.use("/api/v1/community", communityRouter)
// app.use("/api/v1/communityMember", communityMemberRouter)
app.use("/api/v1/bookmark", bookmarkRouter)
app.use("/api/v1/message", messageRouter)
// app.use("/api/v1/grockMessage", grockMessageRouter)
// app.use("/api/v1/grockConversation", grockConversationRouter)
app.use("/api/v1/notification", notificationRouter)

app.get("/", (_, res) => {
    res.json({ message: "API is running..." });
})


export { app }