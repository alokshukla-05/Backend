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
        throw new ApiError(400,"Title and description are required")
    }

    const videoLocalPath = req.files?.video[0]?.path;
    const thumbnailLocalPath = req.files?.thumnail[0]?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400,"Thumnail is required")
    }
    if (!videoLocalPath) {
        throw new ApiError(400,"Video files are required")
    }

    const video = await uploadOnCloudinary(videoLocalPath)
    const thumnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumnail) {
        throw new ApiError(500,"Error uploading Thumnail on cloudinary")
    }
    if (!video) {
        throw new ApiError(500,"Error uploading video on cloudinary")
    }

    const newVideo = await Video.create({
        title,
        description,
        video: video.url,
        thumnail: thumnail.url,
        duration: video.duration,
        owner: req.user?._id,
        isPublished: true,
    });

    return res
    .status(200)
    .json(
        new ApiResponse(200,newVideo,"Video published successfully")
    )
})

export {
    publishAVideo,
}