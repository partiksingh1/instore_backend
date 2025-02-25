import { PrismaClient, Role } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerStoreSchema = z.object({
  name: z.string().min(3),
  email: z.string(),
  password: z.string().min(6),
  role:z.string(),
  storeDetails: z.object({
    storeName: z.string().min(1),
    position: z.string().min(1),
    storeEmail: z.string().min(1).optional(),
    phoneNumber: z.string().min(10),
    website: z.string().optional(),
    email: z.string().optional(),
    facebookPage: z.string().optional(),
    instagramPage: z.string().optional(),
    tiktok: z.string().optional(),
    city: z.string().min(1),
    country: z.string().min(1),
    continent: z.string().min(1)
  }),
  categories: z.array(z.string()).optional(), // New field for categories
});

export const registerStore = async (req: Request, res: Response) => {
  try {
    const parsedData = registerStoreSchema.safeParse(req.body);
    if (!parsedData.success) {
      res.status(400).json({ message: "Invalid input", errors: parsedData.error.errors });
      return;
    }

    const { name, email, password, storeDetails, categories,role } = parsedData.data;

    // Check if user already exists
    const existingUser  = await prisma.user.findFirst({ where: { email } });
    if (existingUser ) {
      res.status(400).json({ message: "User  already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Make sure role is a valid enum value
    let userRole: Role = Role.NON_STORE; // Default to NON_STORE if role is not provided
    if (role && Object.values(Role).includes(role as Role)) {
      userRole = role as Role; // Assign role from the request if it's a valid enum
    }
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole
      },
    });

    // Create store
    const store = await prisma.store.create({
      data: {
        position: storeDetails.position,
        storeName: storeDetails.storeName,
        storeEmail: user.email,
        phoneNumber: storeDetails.phoneNumber,
        website: storeDetails.website,
        facebookPage: storeDetails.facebookPage,
        instagramPage: storeDetails.instagramPage,
        tiktok: storeDetails.tiktok,
        city: storeDetails.city,
        country: storeDetails.country,
        continent: storeDetails.continent,
        userId: user.id,
      },
    });

    // Create categories and associate them with the store
    if (categories && categories.length > 0) {
    const categoryPromises = categories.map(async (categoryName) => {
      // Check if the category already exists
      let category = await prisma.category.findUnique({ where: { name: categoryName } });
      if (!category) {
        // Create new category if it doesn't exist
        category = await prisma.category.create({
          data: { name: categoryName },
        });
      }
      // Return the category ID to connect later
      return category.id;
    });

    // Wait for all category promises to resolve and get the category IDs
    const categoryIds = await Promise.all(categoryPromises);

    // Create entries in the StoreCategory table to associate the store with the categories
    const storeCategoryPromises = categoryIds.map(async (categoryId) => {
      await prisma.storeCategory.create({
        data: {
          storeId: store.id,
          categoryId: categoryId,
        },
      });
    });

    // Wait for all StoreCategory entries to be created
    await Promise.all(storeCategoryPromises);
  }

    res.status(201).json({ message: "Store registered successfully", user, store });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate the request body using zod schema
    const parsedData = loginSchema.safeParse(req.body);
    if (!parsedData.success) {
       res.status(400).json({ message: "Invalid input", errors: parsedData.error.errors });
       return
    }

    const { email, password } = parsedData.data;

    // Find user by email
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
       res.status(400).json({ message: "User not found" });
       return
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
       res.status(400).json({ message: "Invalid credentials" });
       return
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET || "your-jwt-secret", // Ensure to store this securely in env
      { expiresIn: "24h" } // Token expiration time
    );

     res.status(200).json({ message: "Login successful", token });
     return
  } catch (error) {
    console.error(error);
     res.status(500).json({ message: "Internal server error" });
     return
  }
};