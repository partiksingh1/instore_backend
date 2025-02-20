import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Correct import from uuid
import ffmpegLib from 'fluent-ffmpeg';
import { fileURLToPath } from "url";

// Prisma client
const prisma = new PrismaClient();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbcoi7yp8',
  api_key: process.env.CLOUDINARY_API_KEY || '836319682197139',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'n9OBcPnt-1oF51VStUa7DS9sJx8',
});


// Multer storage configuration for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const upload = multer({ storage: storage });
const upload = multer({ dest: 'uploads/' });

/**
 * Controller to handle video creation and upload.
 */
export const createVideo = [
  upload.single('video'), // Upload a single video file
  async (req: Request, res: Response) => {
    try {
      // Ensure a file was uploaded
      if (!req.file) {
         res.status(400).json({ message: 'No video file uploaded.' });
         return
      }

      const { title, duration } = req.body;
      
      // Validate required fields
      if (!title || !duration) {
         res.status(400).json({ message: 'Title and duration are required.' });
         return
      }

      // Upload video to Cloudinary
      const videoFilePath = req.file.path;
      const result = await cloudinary.uploader.upload(videoFilePath, {
        resource_type: 'video', // Specify video resource type
        folder: 'videos', // Optional folder in Cloudinary
      });

      // Clean up the local file after upload
      fs.unlinkSync(videoFilePath);

      // Save video data in the database
      const newVideo = await prisma.video.create({
        data: {
          title,
          url: result.secure_url, // URL from Cloudinary
          duration: parseInt(duration),
        },
      });

      res.status(201).json({
        message: 'Video uploaded successfully!',
        video: newVideo,
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({ message: 'An error occurred while uploading the video.' });
    }
  },
];

/**
 * Controller to get all videos.
 */
export const getVideos = async (req: Request, res: Response) => {
  try {
    const videos = await prisma.video.findMany();
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'An error occurred while fetching videos.' });
  }
};

/**
 * Controller to delete a video.
 */
export const deleteVideo = async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.id);

  if (!videoId) {
     res.status(400).json({ message: 'Invalid video ID.' });
     return
  }

  try {
    // Get the video details from the database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
       res.status(404).json({ message: 'Video not found.' });
       return
    }

    // Delete video from Cloudinary (optional, if you want to delete from Cloudinary)
    const publicId = video.url?.split('/').pop()?.split('.').shift(); // Extract Cloudinary public_id from URL
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }

    // Delete video record from the database
    await prisma.video.delete({
      where: { id: videoId },
    });

    res.status(200).json({ message: 'Video deleted successfully.' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'An error occurred while deleting the video.' });
  }
};

export const processVideo = [
  upload.single('logoFile'),
  async (req: Request, res: Response) => {
    try {
      const { videoUrl } = req.body;
      const logoFile = req.file;

      if (!videoUrl || !logoFile) {
        res.status(400).json({ error: 'Video URL and logo are required' });
        return;
      }

      const outputFileName = `${uuidv4()}.mp4`;
      const outputPath = path.join(__dirname, '../../uploads', outputFileName);

      const ffmpegInstance = ffmpegLib(videoUrl);

      await new Promise<void>((resolve, reject) => {
        ffmpegInstance
          .input(logoFile.path)
          .complexFilter([
            {
              filter: 'overlay',
              options: {
                x: 10,
                y: 10,
                enable: 'gte(t,0)*lt(mod(t,120),60)' // Corrected enable expression
              }
            }
          ])
          .outputOptions('-c:v libx264')
          .outputOptions('-c:a copy')
          .on('end', () => resolve())
          .on('error', (err: any) => reject(err))
          .save(outputPath);
      });

      // Send the processed video
      res.download(outputPath, outputFileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up files
        try {
          fs.unlinkSync(logoFile.path);
          fs.unlinkSync(outputPath);
        } catch (cleanupErr) {
          console.error('Cleanup error:', cleanupErr);
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Video processing failed' });
    }
  }
];