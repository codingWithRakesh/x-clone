import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
}))
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.route.js"
import tweetRouter from "./routes/tweet.route.js"

app.use("/api/v1/user", userRouter)
app.use("/api/v1/tweet", tweetRouter)

app.get("/", (_, res) => {
    res.send("working");
})


export { app }