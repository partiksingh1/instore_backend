import { Request, Response } from "express";
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import ffmpegLib from 'fluent-ffmpeg'
import { v4 as uuidv4 } from 'uuid'; // Correct import from uuid
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { promisify } from "util";
import nodemailer from 'nodemailer';
import { prisma } from "../utils/db.js";
// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbcoi7yp8',
  api_key: process.env.CLOUDINARY_API_KEY || '836319682197139',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'n9OBcPnt-1oF51VStUa7DS9sJx8',
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "partiktanwar30402@gmail.com", // Use environment variables
    pass: "pmdb kabv zyrz lbpn", // Use environment variables
  },
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

const upload = multer({
  dest: 'uploads/', 
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } // Set a limit of 2GB
});
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIATX3PH56IREFCEPBG',
    secretAccessKey: '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'
  },
});
const s3Bucket = 'instorevideos';

/**
 * Controller to handle video creation and upload.
 */
const unlinkAsync = promisify(fs.unlink);


export const processVideo = [
  upload.single('logoFile'),
  async (req: Request, res: Response) => {
    try {
      const { videoUrl, email } = req.body;
      const logoFile = req.file;

      // Validate inputs
      if (!videoUrl || !logoFile || !email) {
        res.status(400).json({ error: 'Video URL, logo, and email are required' });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email address' });
        return;
      }

      // Determine output format based on input URL extension, default to .mp4
      const inputExtension = videoUrl.toLowerCase().endsWith('.mov') ? '.mov' : '.mp4';
      const outputFileName = `${uuidv4()}${inputExtension}`;
      const outputPath = path.join(__dirname, '../../uploads', outputFileName);

      // Process video with FFmpeg
      const ffmpegInstance = ffmpegLib(videoUrl);

      await new Promise<void>((resolve, reject) => {
        ffmpegInstance
          .input(logoFile.path)
          .complexFilter([
            { filter: 'scale', inputs: ['1:v'], options: { w: 'iw/7', h: 'ih/7' }, outputs: ['scaled'] },
            { filter: 'overlay', inputs: ['0:v', 'scaled'], options: { x: 'main_w-overlay_w-10', y: '10' } },
          ])
          .outputOptions('-c:v libx264') // H.264 video codec
          .outputOptions('-preset veryfast') // Faster encoding
          .outputOptions('-threads 2')
          .outputOptions('-c:a copy') // Copy audio codec
          .on('start', (cmd) => console.log('FFmpeg started:', cmd))
          .on('progress', (progress) => console.log('Processing:', progress))
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath);
      });

      // Upload to S3
      const fileContent = fs.readFileSync(outputPath);
      const s3Key = `processed-videos/${outputFileName}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: fileContent,
          ContentType: `video/${inputExtension.slice(1)}`,
        })
      );

      // Generate a signed URL for download (expires in 7 days)
      const downloadUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
        }),
        { expiresIn: 7 * 24 * 60 * 60 } // 7 days
      );

      // Send email with download link
      await transporter.sendMail({
        from: '"In-Store Video" <your-email@gmail.com>',
        to: email,
        subject: 'Your Processed In-Store Video is Ready!',
        html: `
          <h3>Your Video is Ready!</h3>
          <p>Thank you for using our in-store video service. Your video has been processed and is available for download.</p>
          <p><a href="${downloadUrl}">Click here to download your video</a></p>
          <p>This link will be available for 7 days.</p>
          <p>If you have any questions, contact us at POSVideo@instorenetwork.com.</p>
        `,
      });

      // Clean up local files
      try {
        await Promise.all([
          unlinkAsync(logoFile.path),
          unlinkAsync(outputPath),
        ]);
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }

      res.status(200).json({ message: 'Video is being processed. You will receive an email with the download link shortly.' });
    } catch (error: any) {
      console.error('Error processing video:', error.message);
      // Clean up files in case of error
      if (req.file) {
        try {
          await unlinkAsync(req.file.path);
        } catch (cleanupErr) {
          console.error('Cleanup error:', cleanupErr);
        }
      }
      if (error.message.includes('ffmpeg')) {
        res.status(500).json({ error: 'Video processing failed. Please check the input video format.' });
      } else if (error.message.includes('S3')) {
        res.status(500).json({ error: 'Failed to upload video to storage.' });
      } else if (error.message.includes('nodemailer')) {
        res.status(500).json({ error: 'Failed to send email. Video was processed, please contact support.' });
      } else {
        res.status(500).json({ error: 'Video processing failed.' });
      }
    }
  },
];

export const createVideo = [
  upload.single('video'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No video file uploaded.' });
        return;
      }

      const { title,logoUrl } = req.body;
      if (!title) {
        res.status(400).json({ message: 'Title are required.' });
        return;
      }

      const videoFilePath = req.file.path;
      const videoKey = `videos/${Date.now()}-${req.file.originalname}`;

      // Create a read stream from the file
      const fileStream = fs.createReadStream(videoFilePath);

      // Upload to S3 using a stream
      const uploadParams = {
        Bucket: 'instorevideos',
        Key: videoKey,
        Body: fileStream, // Use stream instead of file content
        ContentType: req.file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Generate the video URL
      const videoUrl = `https://instorevideos.s3.us-east-1.amazonaws.com/${videoKey}`;

      // Clean up the local file
      await unlinkAsync(videoFilePath);

      // Save video data in the database
      const newVideo = await prisma.video.create({
        data: {
          title,
          logoUrl,
          url: videoUrl,
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
