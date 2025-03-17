import { Request, Response } from "express";
const prisma = new PrismaClient();
import {z} from "zod"
import multer from 'multer';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbcoi7yp8',
  api_key: process.env.CLOUDINARY_API_KEY || '836319682197139',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'n9OBcPnt-1oF51VStUa7DS9sJx8',
});
interface NewsletterContent {
  title: string;
  description: string;
  language?: string; // Optional, added during translation
}

// Ensure the Prisma model aligns with this structure
interface Newsletter {
  id: number;
  contents: NewsletterContent[]; // Explicitly typing contents as an array
  images: string[];
  recipients: string[];
}


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
const uploadMultiple = upload.array('images', 10); // Limit to 10 images


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

export const createAd = [
  upload.single('image'),  // Multer middleware to handle image upload
  async (req: Request, res: Response) => {
    const adSchema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      link: z.string().optional(),
      position: z.string().min(1, "Position is required"),
    });

    try {
      // Validate request body with Zod schema
      const validatedData = adSchema.parse(req.body);

      let imageUrl = '';

      // If there's an uploaded image, upload it to Cloudinary
      if (req.file) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'ads',  // You can change this folder name based on your needs
            resource_type: 'auto', // Auto detect image/video format
          });
          imageUrl = result.secure_url;

          // Clean up temporary file after upload
          fs.unlinkSync(req.file.path);
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          res.status(500).json({ message: 'Image upload failed' });
          return;
        }
      }

      // Create the ad in the database, including the image URL if it exists
      const newAd = await prisma.ad.create({
        data: {
          ...validatedData,
          imageUrl: imageUrl || validatedData.imageUrl,  // Use imageUrl if provided, else use validated one
        },
      });

      res.status(201).json({ message: "Ad created successfully", ad: newAd });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
        return;
      }
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
];


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
    const categoryId = 44; // For example, categoryId 1 is "Phones"

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

export const createNewsletter = [
  uploadMultiple,
  async (req: Request, res: Response) => {
    const { contents, recipients } = req.body;

    try {
      const contentsArray = JSON.parse(contents); // Array of { title, description }
      const recipientsArray = JSON.parse(recipients); // Array of emails
      const imageFiles = req.files as unknown as Express.Multer.File[];

      // Upload images to Cloudinary
      const imageUrls: string[] = [];
      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'newsletters',
            resource_type: 'auto',
          });
          imageUrls.push(result.secure_url);
          fs.unlinkSync(file.path); // Clean up local file
        }
      }

      const newsletter = await prisma.newsletter.create({
        data: {
          contents: contentsArray,
          images: imageUrls,
          recipients: recipientsArray,
        },
      });

      res.status(201).json({ message: 'Newsletter created successfully', newsletter });
    } catch (error: any) {
      console.error('Error creating newsletter:', error);
      res.status(500).json({ message: 'Failed to create newsletter' });
    }
  },
];

// Get All Newsletters
export const getAllNewsletters = async (req: Request, res: Response) => {
  try {
    const newsletters = await prisma.newsletter.findMany();
    res.status(200).json(newsletters);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch newsletters', error: error.message });
  }
};

// Delete Newsletter
export const deleteNewsletter = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.newsletter.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ message: 'Newsletter deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete newsletter', error: error.message });
  }
};

// Send Newsletter Email with Translation
export const sendNewsletterEmail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { language } = req.body; // Single language code, e.g., 'es'

  try {
    const newsletter = await prisma.newsletter.findUnique({ where: { id: parseInt(id) } });

    if (!newsletter) {
      res.status(404).json({ message: 'Newsletter not found' });
      return;
    }

    const recipients = newsletter.recipients;
    if (!recipients || recipients.length === 0) {
      res.status(400).json({ message: 'No recipients available' });
      return;
    }

    let translatedContents: NewsletterContent[] = newsletter.contents as unknown as NewsletterContent[];

    // Translate contents if a language is provided
    if (language) {
      translatedContents = []; // Override original contents
      for (const content of newsletter.contents as unknown as NewsletterContent[]) {
        try {
          const titleResponse = await axios.get('https://ftapi.pythonanywhere.com/translate', {
            params: { sl: 'en', dl: language, text: content.title },
          });

          const descriptionResponse = await axios.get('https://ftapi.pythonanywhere.com/translate', {
            params: { sl: 'en', dl: language, text: content.description },
          });

          translatedContents.push({
            title: titleResponse.data['destination-text'],
            description: descriptionResponse.data['destination-text'],
            language: language, // Set the language for the translated content
          });
        } catch (error) {
          console.error(`Translation failed for language ${language}:`, error);
          // Optionally, you can choose to keep the original content if translation fails
          translatedContents.push(content); // Fallback to original content
        }
      }
    } else {
      // Keep the original English content if no translation is required
      translatedContents = newsletter.contents as unknown as NewsletterContent[];
    }

    // Email template
    const emailContent = `
     <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #FFFFFF;
            color: #000000;
            padding: 20px;
            text-align: center;
        } 
        .header img {
            max-width: 150px;
        }
        .content {
            padding: 20px;
        }
        .content div {
            background: #ffffff;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #0059c7;
            font-size: 24px;
            margin: 0 0 10px;
        }
        p {
            color: #4e5762;
            line-height: 1.5;
        }
        .footer {
            background-color: #f0f0f0;
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #777777;
        }
        .cta-button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #c70000;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
        }
        .social-links {
            margin-top: 10px;
        }
        .social-links a {
            margin: 0 5px;
            text-decoration: none;
            color: #0059c7;
        }
        @media (max-width: 600px) {
            .container {
                width: 100%;
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://ci3.googleusercontent.com/meips/ADKq_NY6tnl6uVZ4nK59Q7J8JTuaGU0q0-XcH9ZD0fsvFK2QIFzdAi5x3YZBZLkGXCP9SJ9NfYF1ZJPqfrSR2yHZOcb0k6drTBGrVQsa3eCMm1xC6vpchfMoyWXNu5CGFpSNewBd=s0-d-e1-ft#https://4ee92f741d.imgdist.com/pub/bfra/5tife24r/js6/9tp/dvx/roundedlogo.png" alt="Your Logo">
            <h1>Your Newsletter Title</h1>
        </div>
        <div class="content">
            ${translatedContents.map((content) => `
                <div>
                    <h1>${content.title}</h1>
                    <p>${content.description}</p>
                    ${content.language ? `<p><small>Language: ${content.language}</small></p>` : ''}
                </div>
            `).join('')}
            ${newsletter.images.map((img: string) => `
                <div style="margin-bottom: 20px;">
                    <img src="${img}" alt="Newsletter Image" style="max-width: 100%; border-radius: 8px;" />
                </div>
            `).join('')}
            <a href="https://instorenetwork.co.uk/" class="cta-button">Visit Us</a>
        </div>
        <div class="footer">
            <p>Thank you for reading our newsletter!</p>
            <p>Contact us: <a href="mailto:info@yourdomain.com">info@yourdomain.com</a></p>
            <div class="social-links">
                <a href="https://facebook.com/yourpage">Facebook</a>
                <a href="https://twitter.com/yourpage">Twitter</a>
                <a href="https://instagram.com/yourpage">Instagram</a>
            </div>
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: "partiktanwar30402@gmail.com", // Use environment variables
        pass: "pmdb kabv zyrz lbpn", // Use environment variables
      },
    });

    for (const recipient of recipients) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: translatedContents.length > 0 ? translatedContents[0].title : 'Newsletter',
        html: emailContent,
      });
      console.log(`Email sent to ${recipient}`);
    }

    res.status(200).json({ message: 'Newsletter sent successfully' });
  } catch (error: any) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ message: 'Failed to send newsletter', error: error.message });
  }
};


export const createWindow = [
  upload.single('media'), // Change the field name to 'media' to handle both image and video
  async (req: Request, res: Response) => {
    try {
      const { title, description, url,content } = req.body;

      // Ensure all necessary fields are provided
      if (!title || !description || !url) {
        res.status(400).json({ message: 'Title, description, and URL are required.' });
        return;
      }

      let mediaUrl = ''; // Store the URL of the image/video

      if (req.file) {
          // If it's an image, upload it to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto', // Specify video resource type
        folder: 'videos', // Optional folder in Cloudinary
          });

          mediaUrl = uploadResult.secure_url;

        // Clean up the temporary file after uploading
        fs.unlinkSync(req.file.path);
      }

      // Create the store window in the database
      const newWindow = await prisma.storeWindow.create({
        data: {
          title,
          description,
          content,
          url,
          imageUrl: mediaUrl, // Save the image/video URL here
        },
      });

      res.status(201).json({
        success: true,
        message: 'StoreWindow created successfully.',
        data: newWindow,
      });
      return;
    } catch (error) {
      console.error('Error creating StoreWindow:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating the StoreWindow.',
      });
      return;
    }
  }
];


// Get all StoreWindows
export const getWindows = async (req: Request, res: Response) => {
  try {
    const windows = await prisma.storeWindow.findMany();

    if (windows.length === 0) {
       res.status(404).json({ message: 'No store windows found.' });
       return
    }

     res.status(200).json({
      success: true,
      data: windows,
    });
    return
  } catch (error) {
    console.error('Error fetching StoreWindows:', error);
     res.status(500).json({
      success: false,
      message: 'An error occurred while fetching StoreWindows.',
    });
    return
  }
};

// Delete StoreWindow by ID
export const deleteWindow = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Find the StoreWindow by ID
    const window = await prisma.storeWindow.findUnique({
      where: { id: Number(id) },
    });

    if (!window) {
       res.status(404).json({ message: 'StoreWindow not found.' });
       return
    }

    // Delete the StoreWindow from the database
    await prisma.storeWindow.delete({
      where: { id: Number(id) },
    });

    // If there is an image URL, delete it from Cloudinary
    if (window.imageUrl) {
      const publicId = window.imageUrl.split('/').pop()?.split('.')[0]; // Extract public ID from the image URL
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

     res.status(200).json({
      success: true,
      message: 'StoreWindow deleted successfully.',
    });
    return
  } catch (error) {
    console.error('Error deleting StoreWindow:', error);
     res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the StoreWindow.',
    });
    return
  }
};