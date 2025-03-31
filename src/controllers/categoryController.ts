import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/db.js";

export const fetchCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany()
        if(categories){
            res.status(200).json({message: "categories fetched",categories})
            return
        }
    } catch (error) {
        console.error(error);
    res.status(500).json({ message: "Internal server error" });
    }
}

export const createCategory = async (req: Request, res: Response) => {
    // Define a schema for validation using zod
    const categorySchema = z.object({
        name: z.string().min(1, "Category name is required"), // Ensure the name is a non-empty string
    });

    // Validate the request body against the schema
    try {
        const validatedData = categorySchema.parse(req.body);
        const { name } = validatedData;

        // Check if the category already exists
        const existingCategory = await prisma.category.findUnique({
            where: { name: name.toUpperCase() }, // Assuming you want to store category names in uppercase
        });

        if (existingCategory) {
             res.status(400).json({ message: "Category already exists" });
             return
        }

        // Create the new category
        const newCategory = await prisma.category.create({
            data: {
                name: name.toUpperCase(), // Store the name in uppercase
            },
        });

        res.status(201).json({ message: "Category created successfully", category: newCategory });
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Handle validation errors
             res.status(400).json({ message: error.errors });
             return
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params; // Assuming the category ID is passed as a URL parameter

    try {
        // Check if the category exists
        const category = await prisma.category.findUnique({
            where: { id: Number(id) },
        });

        if (!category) {
             res.status(404).json({ message: "Category not found" });
             return
        }

        // Check if there are any stores associated with this category
        const storeCount = await prisma.storeCategory.count({
            where: { categoryId: category.id },
        });

        if (storeCount > 0) {
             res.status(400).json({ message: "Cannot delete category with associated stores" });
             return
        }

        // Delete the category
        await prisma.category.delete({
            where: { id: category.id },
        });

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Add a product to a category
export const addProduct = async (req: Request, res: Response) => {
  const { name, categoryId , brandUrl } = req.body;

  try {
    // Validate input
    if (!name || !categoryId || !brandUrl) {
       res.status(400).json({ error: "Product name and categoryId are required" });
       return
    }

    // Create the product in the database
    const product = await prisma.product.create({
      data: {
        name,
        brandUrl,
        categoryId, // Relating the product to a category
      },
    });

     res.status(201).json({ product });
     return
  } catch (error) {
    console.error(error);
     res.status(500).json({ error: "Failed to create product" });
     return
  }
};

// Edit an existing product
export const editProduct = async (req: Request, res: Response) => {
  const { id } = req.params; // Product ID to edit
  const { name, categoryId } = req.body; // New data to update

  try {
    // Find product
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) {
       res.status(404).json({ error: "Product not found" });
       return
    }

    // Update the product in the database
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name || product.name, // Keep existing if name is not provided
        categoryId: categoryId || product.categoryId, // Keep existing if categoryId is not provided
      },
    });

     res.status(200).json({ updatedProduct });
     return
  } catch (error) {
    console.error(error);
     res.status(500).json({ error: "Failed to update product" });
     return
  }
};

// Delete a product
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Find and delete the product
    const deletedProduct = await prisma.product.delete({
      where: { id: parseInt(id) },
    });

     res.status(200).json({ message: "Product deleted successfully", deletedProduct });
     return
  } catch (error) {
    console.error(error);
     res.status(500).json({ error: "Failed to delete product" });
     return
  }
};

// Get all products in a category
export const getProductsInCategory = async (req: Request, res: Response) => {
    const { categoryName } = req.params; // Category name to fetch products
  
    try {
      // Fetch products by category name
      const products = await prisma.product.findMany({
        where: {
          category: {
            name: categoryName, // Search using category name
          },
        },
        include: {
          category: true, // Optional: include the category details in the result if needed
        },
      });
  
      res.status(200).json({ products });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch products" });
      return;
    }
  };
  
