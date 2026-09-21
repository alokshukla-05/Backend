import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
//unlink matlab jab koi file delete karte hai toh o file unlink hojata hai


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file  cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)  // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

//delete image from cloudinary
const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return null

        //extract public_id from url
        const publicId = fileUrl
        .split("/upload/")[1]
        split("/")
        .slice(1)
        .join("/")
        .split(".")[0];

        const deleteFile = await cloudinary.uploader.destroy(publicId)
        return deleteFile;
    } catch (error) {
        console.log("Error while deleting from Cloudinary:", error)
        return null;
    }
};

export {uploadOnCloudinary,deleteFromCloudinary}
    