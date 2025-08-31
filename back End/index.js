import express from 'express'
import {connectserver} from "./db.js"
import 'dotenv/config'
const app = express()
connectserver()
app.use(express.json())
app.get("/",(req,res)=>{
    res.json({"App":"Your X-app server is run."})
})
app.listen(process.env.PORT,()=>{
   console.log(`Server Started on http://localhost:${process.env.PORT}`)
})