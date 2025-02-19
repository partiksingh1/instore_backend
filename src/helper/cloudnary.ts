import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImageToCloudinary = async (imagePath: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'newsletters/', // Optional folder for better organization
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Image upload failed');
  }
};
