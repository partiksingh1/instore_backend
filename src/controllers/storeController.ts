import { Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define a schema for validating the request parameters
const fetchStoresSchema = z.object({
  category: z.string().min(1),
  country: z.string().min(1),
  page: z.coerce.number().min(1).default(1),  // Add page number with a default value of 1
  pageSize: z.coerce.number().min(1).default(10),  // Add page size with a default value of 10
});

export const fetchStoresByCategoryAndCountry = async (req: Request, res: Response) => {
  try {
    // Validate the request parameters using zod schema
    const parsedData = fetchStoresSchema.safeParse({ ...req.params, ...req.query });
    if (!parsedData.success) {
      res.status(400).json({ message: "Invalid input", errors: parsedData.error.errors });
      return;
    }

    const { category, country, page, pageSize } = parsedData.data;

    // Fetch stores that belong to the specified category and country with pagination
    const stores = await prisma.store.findMany({
      where: {
        country: country,
        categories: {
          some: {
            category: {
              name: category,
            },
          },
        },
      },
      include: {
        categories: {
          include: {
            category: true, // Include category details if needed
          },
        },
      },
      skip: (page - 1) * pageSize,  // Calculate skip for pagination
      take: pageSize,  // Take only the number of items defined by pageSize
    });

    // Fetch the total number of stores to calculate total pages
    const totalStores = await prisma.store.count({
      where: {
        country: country,
        categories: {
          some: {
            category: {
              name: category,
            },
          },
        },
      },
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalStores / pageSize);

    // Check if any stores were found
    if (stores.length === 0) {
      res.status(404).json({ message: "No stores found for the specified category and country." });
      return;
    }

    // Return the found stores along with pagination information
    res.status(200).json({
      stores,
      pagination: {
        page,
        pageSize,
        totalStores,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const fetchWandDByCategoryAndCountry = async (req: Request, res: Response) => {
  try {
    // Validate the request parameters using zod schema
    const parsedData = fetchStoresSchema.safeParse({ ...req.params, ...req.query });
    if (!parsedData.success) {
      res.status(400).json({ message: "Invalid input", errors: parsedData.error.errors });
      return;
    }

    const { category, country, page, pageSize } = parsedData.data;

    // Fetch stores that belong to the specified category and country with pagination
    const stores = await prisma.store.findMany({
      where: {
        country: country,
        categories: {
          some: {
            category: {
              name: category,
            },
          },
        },
      },
      include: {
        categories: {
          include: {
            category: true, // Include category details if needed
          },
        },
      },
      skip: (page - 1) * pageSize,  // Calculate skip for pagination
      take: pageSize,  // Take only the number of items defined by pageSize
    });

    // Fetch the total number of stores to calculate total pages
    const totalStores = await prisma.store.count({
      where: {
        country: country,
        categories: {
          some: {
            category: {
              name: category,
            },
          },
        },
      },
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalStores / pageSize);

    // Check if any stores were found
    if (stores.length === 0) {
      res.status(404).json({ message: "No stores found for the specified category and country." });
      return;
    }

    // Return the found stores along with pagination information
    res.status(200).json({
      stores,
      pagination: {
        page,
        pageSize,
        totalStores,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
