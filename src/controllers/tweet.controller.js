import mongoose,{isValidObjectId} from "mongoose";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {Tweet} from "../models/tweet.model.js";

//create kar rahe hai tweet
const createTweet = asyncHandler( async(req, res) => {
    const {content} = req.body;
    
    if (!content || content.trim() === "") {
        throw new ApiError(400,"content is required")
    }

    //create a content
    const tweet = await Tweet.create({
        content,
        owner: req.user._id,
    });

    if (!tweet) {
        throw new ApiError(500,"Failed to create tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet created successfully")
    )
})

//get user tweet
const getUserTweets = asyncHandler( async(req, res) => {
    const {userId} = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400,"Invalid userId")
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404,"user not found")
    }

    const tweets = await Tweet.find({ owner: userId })
    .populate("owner","username fullName avatar")
    .sort({ createdAt:-1 })

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweets,"Tweets fetched successfully")
    )
})

//tweets ko update karna hai
const updateTweet = asyncHandler( async(req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400,"Invalid tweetId")
    }

    if(!content || content.trim() === "") {
        throw new ApiError(400,"content is required")
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404,"Tweet not found")
    }

    //check ki jo persoon ha o authroized hai ki nahi udate karne ke liye
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,"You are not authorized to update this tweet")
    }

    tweet.content = content;
    await tweet.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet updated successfully")
    )
})

//here we an delete tweet
const deleteTweet = asyncHandler( async(req, res) => {
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400,"Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet) {
        throw new ApiError(404,"Tweet is not found")
    }

    //ownership check
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,"you are not authorized person")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}