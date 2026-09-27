import mongoose,{isValidObjectId} from "mongoose";
import {Video} from "../models/video.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler( async(req, res) => {
    const {page = 1, limit = 10, query, sortBy = "createdAt",sortType = "desc", userId} = req.query

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (!(pageNum || limitNum)) {
        throw new ApiError(400,"Page and limit must be valid number");
        
    }

    const pipeline = [];

    if(query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query,$options: "i" } },
                    { description: { $regex: query,$options: "i" } },
                ],
            },
        });
    }

    if (userId) {
        if (!isValidObjcetId(userId)) {
            throw new ApiError(400,"Invalid user Id")
        }
        pipeline.push({
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        })
    }

    pipeline.push({
        $sort: {
            [sortBy]: sortType === "asc" ? 1 : -1,
        }
    })

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        { $unwind: "$owner" }
    )

    const options = {
        page: pageNum,
        limit: limitNum,
    }

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,videos,"Videos fetched successfully")
    )
})

//publish video
const publishAVideo = asyncHandler( async(req, res) => {
    const { title, description } = req.body

    if(!title || !description) {
        throw new ApiError(400,"Title and description are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400,"Thumbnail is required")
    }
    if (!videoLocalPath) {
        throw new ApiError(400,"Video files are required")
    }

    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail) {
        throw new ApiError(500,"Error uploading Thumbnail on cloudinary")
    }
    if (!video) {
        throw new ApiError(500,"Error uploading video on cloudinary")
    }

    const newVideo = await Video.create({
        title,
        description,
        videoFile: video.url,
        thumbnail: thumbnail.url,
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

//here we search video by ID
const getVideoById = asyncHandler( async (req, res) => {
    const {videoId} = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400,"Invalid video Id")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: {views:1} },
        {new: true}
    ).populate("owner","username fullName avatar")

    if (!video) {
        throw new ApiError(404,"Video not Found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,video,"Video fetched successfully")
    )
})

//here will will update video
const updateVideo = asyncHandler( async(req, res) => {
    const {videoId} = req.params
    const {title,description} = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400,"Invalid video id")
    }

    if (!(title || description)) {
        throw new ApiError(400,"Title and description is required")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"video is not found")
    }

    //for owner
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403,"you are not authorized to update this video")
    }

    const thumbnailLocalPath = req.file?.path;

    let thumbnail;
    if(thumbnailLocalPath){
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail) {
            throw new ApiError(500,"error uploading new thumbnail")
        }
        //here i will delete persove thumbnail from cloudinary
        await deleteFromCloudinary(video.thumbnail,"image")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title || video.title,
                description: description || video.description,
                thumbnail: thumbnail?.url || video.thumbnail,
            },
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,updatedVideo,"video updated successfully")
    )
})

//delete video
const deleteVideo = asyncHandler( async(req, res) => {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"video not found")
    }

    //owner can delete video
    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403,"you are not authorized to delete this video")
    }

    await deleteFromCloudinary(video.videoFile,"video")
    await deleteFromCloudinary(video.thumbnail,"image")

    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"video deleted successfully")
    )
})

//toggle publish status
const togglePublishStatus = asyncHandler( async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"video not found")
    }

    //owner can toggle video
    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403,"you are not authorized to delete this video")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {$set: {isPublished: !video.isPublished}},
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedVideo,
            `Video ${updatedVideo.isPublished ? "published" : "unpublished"}`
        )
    )
})

export {
    publishAVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}