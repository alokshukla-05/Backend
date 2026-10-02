import mongoose,{isValidObjectId} from "mongoose";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {Subscription} from "../models/subscription.model.js";
import {User} from "../models/user.model.js";

const toggleSubcription = asyncHandler( async(req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400,"Invalid channel Id")
    }

    //check yourself because khud ko subscribe nahi kar sakte hai
    if (channelId === req.user._id.toString()) {
        throw new ApiError(400,"You can not subcribe yourself")
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404,"channel not found")
    }

    //checking ki phele se subcribe toh nahi kiya hai
    const existingSub = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId,
    })

    //for unsubscribed
    if (existingSub) {
        await Subscription.findByIdAndDelete(existingSub._id);
        return res
        .status(200)
        .json(
            new ApiResponse(200,{},"unsubscribed successfully")
        )
    }

    //for subscribe
    await Subscription.create({
        subscriber: req.user._id,
        channel: channelId,
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Subscribed successfully")
    )
})

//subscriber list
const getUserChannelSubscribers = asyncHandler( async(req, res) => {
    const {channelId} = req.params;

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400,"invalid channel Id")
    }

    const subscribers = await Subscription.find({channel:channelId}).populate(
        "subscriber",
        "username fullName avatar"
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,subscribers,"Subscribers fetched successfully")
    )
})

//return the channel list which user has subscribed
const getSubscribedChannels = asyncHandler( async(req, res) => {
    const {subscriberId} = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400,"invalid subscriberId")
    }

    const channels = await Subscription.find({subscriber: subscriberId}).populate(
        "channel",
        "username fullName avatar"
    )

    return res
    .status(200)
    .json(new ApiResponse(200,channels,"subscribed channels fetched successfullyy"))
})

export {
    toggleSubcription,
    getUserChannelSubscribers,
    getSubscribedChannels
}