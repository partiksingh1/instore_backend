import { Request, Response } from "express";
const prisma = new PrismaClient();
import {z} from "zod"
import { uploadImageToCloudinary } from "../helper/cloudnary.js";
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

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



export const createNewsletter = [
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
          folder: 'newsletters',
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
    const newNewsletter = await prisma.newsletter.create({
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



export const getNewsletters = async (req: Request, res: Response) => {
  try {
    const newsletters = await prisma.newsletter.findMany();
    res.status(200).json(newsletters);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({
      message: 'An error occurred while fetching newsletters.',
    });
  }
};

export const deleteNewsletter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the newsletter to delete
    const newsletter = await prisma.newsletter.findUnique({
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
    await prisma.newsletter.delete({
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
