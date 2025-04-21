import cloudinary from "../config/cloudinaryConfig.js";

/**
 * Uploads a file to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The folder to upload to (e.g., 'admin/profile', 'users/profile')
 * @returns {Promise<Object>} - Cloudinary upload response
 */
export const uploadToCloudinary = async (fileBuffer, folder) => {
  try {
    // Convert buffer to base64
    const fileStr = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      folder: folder,
      resource_type: "auto",
      allowed_formats: ["jpg", "png", "jpeg", "gif"],
    });

    return {
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    };
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload image");
  }
};

/**
 * Deletes a file from Cloudinary
 * @param {string} public_id - The public_id of the file to delete
 * @returns {Promise<Object>} - Cloudinary deletion response
 */
export const deleteFromCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return {
      success: true,
      result: result,
    };
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw new Error("Failed to delete image");
  }
};
