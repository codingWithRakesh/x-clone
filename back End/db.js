import mongoose from 'mongoose'
export const connectserver =async()=>{
    try {
        await mongoose.connect('mongodb://localhost:27017/');
        console.log("The server is run.")
        
    } catch (error) {
        console.log(error)
        process.exit(1);
    }
}
