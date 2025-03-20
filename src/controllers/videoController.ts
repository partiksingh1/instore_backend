import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Correct import from uuid
import ffmpegLib from 'fluent-ffmpeg';
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promisify } from "util";
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

const upload = multer({
  dest: 'uploads/', 
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // Set a limit of 2GB
});
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIA47CRVV7TCQ3NNJGM',
    secretAccessKey: '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'
  },
});

/**
 * Controller to handle video creation and upload.
 */
const unlinkAsync = promisify(fs.unlink);

export const createVideo = [
  upload.single('video'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No video file uploaded.' });
        return;
      }

      const { title } = req.body;
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

// export const processVideo = [
//   upload.single('logoFile'),
//   async (req: Request, res: Response) => {
//     try {
//       const { videoUrl } = req.body;
//       const logoFile = req.file;

//       if (!videoUrl || !logoFile) {
//         res.status(400).json({ error: 'Video URL and logo are required' });
//         return;
//       }

//       const outputFileName = `${uuidv4()}.mp4`;
//       const outputPath = path.join(__dirname, '../../uploads', outputFileName);

//       const ffmpegInstance = ffmpegLib(videoUrl);

// // Wraps the entire ffmpeg process inside a Promise for asynchronous execution
// await new Promise<void>((resolve, reject) => {
//   // Initiates an ffmpeg process on the logo file (input source)
//   ffmpegInstance
//     // Set the input file for ffmpeg (logo file)
//     .input(logoFile.path)

//     // Apply a single filter for scaling the logo and overlaying it
//     .complexFilter([
//       // First filter: Scaling the logo to half its size
//       {
//         filter: 'scale', // Apply scaling filter
//         inputs: ['1:v'], // Input source is the logo image (second input)
//         options: {
//           w: 'iw/7', // Set the width of the logo to half of the original width
//           h: 'ih/7'  // Set the height of the logo to half of the original height
//         },
//         outputs: ['scaled'] // Output is the scaled logo stream
//       },

//       // Second filter: Overlay the scaled logo onto the main video at the top-right corner
//       {
//         filter: 'overlay', // Apply overlay filter
//         inputs: ['0:v', 'scaled'], // First input is the main video, second is the scaled logo
//         options: {
//           // Position the logo at the top-right corner
//           x: 'main_w-overlay_w-10', // x-position is right aligned (10px margin from the right edge)
//           y: '10' // y-position is 10px from the top edge
//         }
//       }
//     ])

//     // Set the video codec to libx264 (for H.264 compression)
//     .outputOptions('-c:v libx264')

//     // Copy the original audio without re-encoding it
//     .outputOptions('-c:a copy')

//     // Resolve the promise when the process completes successfully
//     .on('end', () => resolve())

//     // Reject the promise if an error occurs during the process
//     .on('error', (err: any) => reject(err))

//     // Save the processed video to the specified output path
//     .save(outputPath);
// });



//       // Send the processed video
//       res.download(outputPath, outputFileName, (err) => {
//         if (err) {
//           console.error('Download error:', err);
//         }
//         // Clean up files
//         try {
//           fs.unlinkSync(logoFile.path);
//           fs.unlinkSync(outputPath);
//         } catch (cleanupErr) {
//           console.error('Cleanup error:', cleanupErr);
//         }
//       });

//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Video processing failed' });
//     }
//   }
// ];

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

      // Determine output format based on input URL extension, default to .mp4
      const inputExtension = videoUrl.toLowerCase().endsWith('.mov') ? '.mov' : '.mp4';
      const outputFileName = `${uuidv4()}${inputExtension}`;
      const outputPath = path.join(__dirname, '../../uploads', outputFileName);

      const ffmpegInstance = ffmpegLib(videoUrl);

      await new Promise<void>((resolve, reject) => {
        ffmpegInstance
          .input(logoFile.path)
          .complexFilter([
            { filter: 'scale', inputs: ['1:v'], options: { w: 'iw/7', h: 'ih/7' }, outputs: ['scaled'] },
            { filter: 'overlay', inputs: ['0:v', 'scaled'], options: { x: 'main_w-overlay_w-10', y: '10' } }
          ])
          .outputOptions('-c:v libx264')      // H.264 video codec (works for both .mp4 and .mov)
          .outputOptions('-preset ultrafast') // Faster encoding
          .outputOptions('-threads 2')
          .outputOptions('-c:a copy')         // Copy audio codec
          .outputOptions('-f mov')            // Explicitly set format to mov if needed (optional)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath);
          ffmpegInstance
  .on('start', (cmd) => console.log('ffmpeg started:', cmd))
  .on('progress', (progress) => console.log('Processing:', progress))
  .on('error', (err) => console.error('ffmpeg error:', err.message));
      });

      res.download(outputPath, outputFileName, async (err: any) => {
        if (err) console.error('Download error:', err);
        try {
          await Promise.all([
            fs.promises.unlink(logoFile.path),
            fs.promises.unlink(outputPath)
          ]);
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