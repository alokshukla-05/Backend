import mongoose,{isValidObjectId} from "mongoose";
import {Video} from "../models/video.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// const getAllVideos = asyncHandler( async(req, res) => {
//     const {page = 1, limit = 10, query, sortBy,sortType, userId} = req.query

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     if (!(pageNum || limitNum)) {
//         throw new ApiError(400,"Page and limit must be valid number");
        
//     }

//     const pipeline = [];

//     if(query) {
//         pipeline.push({
//             $match: {
//                 $or: [
//                     { title: {  } }
//                 ]
//             }
//         })
//     }
// })

//publish video
const publishAVideo = asyncHandler( async(req, res) => {
    const { title, description } = req.body

    if(!title || !description) {
        throw new ApiError(401,"All fileds are required")
    }
    
})

export {}