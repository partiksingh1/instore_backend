import { Request, Response, NextFunction } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const videoController = {
  async processVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.video || !files.logo) {
        return res.status(400).json({ error: 'Both video and logo are required' });
      }
  
      const videoPath = files.video[0].path;
      const logoPath = files.logo[0].path;
      const outputPath = path.join('uploads', `output-${Date.now()}.mp4`);
  
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', videoPath,
          '-i', logoPath,
          '-filter_complex',
          `overlay=100:50`,
          outputPath
        ]);

        console.log("ffmpeg is ",ffmpeg );
        
  
        ffmpeg.stderr.on('data', (data) => {
          console.error(`FFmpeg Log: ${data}`);
        });
  
        ffmpeg.on('error', (error) => {
          console.error('FFmpeg Error:', error);
          reject(error);
        });
  
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve(outputPath);
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        });
      });
  
      // Clean up input files
      fs.unlinkSync(videoPath);
      fs.unlinkSync(logoPath);
  
      // Send the file path back to the client
      res.json({ 
        message: 'Video processed successfully',
        outputPath: `/uploads/${path.basename(outputPath)}`
      });
  
    } catch (error) {
      // Clean up any files if they exist
      try {
        if (req.files) {
          const files = req.files as { [fieldname: string]: Express.Multer.File[] };
          if (files.video) fs.unlinkSync(files.video[0].path);
          if (files.logo) fs.unlinkSync(files.logo[0].path);
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
  
      next(error);
    }
  },

  // New method to download the video
  downloadVideo(req: Request, res: Response) {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', filename);

    res.download(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: 'File not found' });
      }
    });
  }
};

export default videoController;