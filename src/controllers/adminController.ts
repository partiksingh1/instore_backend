import { Request, Response } from "express";
const prisma = new PrismaClient();
import {z} from "zod"
import { uploadImageToCloudinary } from "../helper/cloudnary.js";
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import mailjet from 'node-mailjet';

const { Client } = mailjet;

const mailjetClient = new Client({
  apiKey: "process.env.MJ_APIKEY_PUBLIC",
  apiSecret: "process.env.MJ_APIKEY_PRIVATE",
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbcoi7yp8',
  api_key: process.env.CLOUDINARY_API_KEY || '836319682197139',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'n9OBcPnt-1oF51VStUa7DS9sJx8',
});



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });



export const createLatest = [
  upload.single('image'),
  async (req: Request, res: Response) =>{
  console.log('Uploaded file:', req.file); 
  try {
    console.log('File uploaded:', req.file); // Log the uploaded file to check if it's processed
    const { subject, content ,link } = req.body;

    let imageUrl='';

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'latest',
          resource_type: 'auto',
        });
        imageUrl = result.secure_url;
        
        // Clean up temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        res.status(500).json({ message: 'Image upload failed' });
        return;
      }finally {
        // Clean up uploaded file if it exists and hasn't been deleted
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    }
    

    // Save the newsletter in the database
    const newNewsletter = await prisma.latest.create({
      data: {
        subject,
        content,
        link,
        imageUrl,
      },
    });

    res.status(201).json({
      message: 'Newsletter created successfully',
      newsletter: newNewsletter,
    });
  } catch (error) {
    console.error('Error creating newsletter:', error);
    res.status(500).json({
      message: 'An error occurred while creating the newsletter.',
    });
  }
},
]



export const getLatest = async (req: Request, res: Response) => {
  try {
    const newsletters = await prisma.latest.findMany();
    res.status(200).json(newsletters);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({
      message: 'An error occurred while fetching newsletters.',
    });
  }
};

export const deleteLatest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the newsletter to delete
    const newsletter = await prisma.latest.findUnique({
      where: { id: parseInt(id) },
    });

    if (!newsletter) {
       res.status(404).json({
        message: 'Newsletter not found',
      });
      return
    }

    // If there is an image URL, delete the image from Cloudinary
    if (newsletter.imageUrl) {
      const publicId = newsletter.imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(publicId); // Delete image from Cloudinary
      }
    }

    // Delete the newsletter from the database
    await prisma.latest.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      message: 'Newsletter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    res.status(500).json({
      message: 'An error occurred while deleting the newsletter.',
    });
  }
};

export const createAd = async (req: Request, res: Response) => {
  const adSchema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      link: z.string().optional(),
      position: z.string().min(1, "Position is required"),
  });

  try {
      const validatedData = adSchema.parse(req.body);
      const newAd = await prisma.ad.create({
          data: validatedData,
      });

      res.status(201).json({ message: "Ad created successfully", ad: newAd });
  } catch (error) {
      if (error instanceof z.ZodError) {
           res.status(400).json({ message: error.errors });
           return
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAd = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
      const ad = await prisma.ad.findUnique({
          where: { id: Number(id) },
      });

      if (!ad) {
           res.status(404).json({ message: "Ad not found" });
           return
      }

      await prisma.ad.delete({
          where: { id: ad.id },
      });

      res.status(200).json({ message: "Ad deleted successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchAds = async (req: Request, res: Response) => {
  try {
      const ads = await prisma.ad.findMany();
      res.status(200).json({ message: "Ads fetched successfully", ads });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
};


export const fetchAdsByPosition = async (req: Request, res: Response) => {
  const { place } = req.body;

  // Validate the place field
  if (!place) {
     res.status(400).json({ message: "Place is required." });
     return
  }

  try {
    // Fetch ads by position
    const ads = await prisma.ad.findMany({
      where: {
        position: place,
      },
    });

    // Check if any ads were found
    if (ads.length === 0) {
       res.status(404).json({ message: `No ads found for ${place}` });
       return
    }

    // Respond with the found ads
    res.status(200).json({
      message: `Ads fetched successfully for ${place}`,
      ads,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const batchproducts = async (req: Request, res: Response)=> {
  const { products } = req.body;  // Expected to receive an array of products
  
  // Validate that 'products' is an array and categoryId is valid
  if (!Array.isArray(products) || products.length === 0) {
     res.status(400).json({ error: 'Products array is required' });
     return
  }

  try {
    // Assuming all products should go into the same category
    const categoryId = 2; // For example, categoryId 1 is "Phones"

    const createdProducts = await prisma.product.createMany({
      data: products.map((product: { name: string }) => ({
        name: product.name,
        categoryId,
      })),
    });

     res.status(201).json({ message: 'Products added successfully', createdProducts });
     return
  } catch (error) {
    console.error(error);
     res.status(500).json({ error: 'Failed to add products' });
     return
  }
};

// Create a new newsletter
export const createNewsletter = async (req: Request, res: Response) => {
  const { subject, bodyText, images, videos, links, recipients }: {
    subject: string;
    bodyText: string;
    images: string[];
    videos: string[];
    links: string[];
    recipients: string[];
  } = req.body;

  try {
    const newsletter = await prisma.newsletter.create({
      data: {
        subject,
        bodyText,
        images,
        videos,
        links,
        recipients,
      },
    });
    res.status(201).json(newsletter);
  } catch (error:any) {
    res.status(500).json({ error: 'Failed to create the newsletter', message: error.message });
  }
};

// Get all newsletters
export const getAllNewsletters = async (req: Request, res: Response) => {
  try {
    const newsletters = await prisma.newsletter.findMany();
    res.status(200).json(newsletters);
  } catch (error:any) {
    res.status(500).json({ error: 'Failed to fetch newsletters', message: error.message });
  }
};

// Delete a newsletter by ID
export const deleteNewsletter = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.newsletter.delete({
      where: {
        id: parseInt(id),
      },
    });
    res.status(200).json({ message: 'Newsletter deleted successfully' });
  } catch (error:any) {
    res.status(500).json({ error: 'Failed to delete the newsletter', message: error.message });
  }
};

export const sendNewsletterEmail = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: parseInt(id) },
    });

    if (!newsletter) {
       res.status(404).json({ error: 'Newsletter not found' });
       return
    }

    // Ensure arrays are handled correctly
    const images = Array.isArray(newsletter.images) ? newsletter.images : [];
    const videos = Array.isArray(newsletter.videos) ? newsletter.videos : [];
    const links = Array.isArray(newsletter.links) ? newsletter.links : [];
    const recipients = Array.isArray(newsletter.recipients) ? newsletter.recipients : [];

    if (recipients.length === 0) {
       res.status(400).json({ error: 'No recipients available to send the newsletter' });
       return
    }

    // Prepare the email content
    const emailContent = `
      <h1>${newsletter.subject}</h1>
      <p>${newsletter.bodyText}</p>
      <h3>Images:</h3>
      ${images.map((image) => `<img src="${image}" alt="Image" />`).join('')}
      <h3>Videos:</h3>
      ${videos.map((video) => `<a href="${video}">Watch Video</a>`).join('<br>')}
      <h3>Links:</h3>
      ${links.map((link) => `<a href="${link}">${link}</a>`).join('<br>')}
    `;

    // Send the email
    const request = mailjetClient.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'your-email@example.com',
            Name: 'Your Name or Business',
          },
          To: recipients.map((email) => ({ Email: email })),
          Subject: newsletter.subject,
          HTMLPart: emailContent,
        },
      ],
    });

    const result = await request;

    res.status(200).json({
      message: 'Newsletter sent successfully',
      response: result.body,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: 'Failed to send the newsletter',
      message: error.message,
    });
  }
};