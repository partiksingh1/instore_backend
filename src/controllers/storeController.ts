import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/db.js";

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
        isVerified:true,
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
        isVerified: true,
        categories: {
          some: {
            category: {
              name: category,
            },
          },
        },
        role: {
          in: ['ALL', 'WHOLESALER', 'DISTRIBUTOR'],  // Filter stores by specific roles
        },
      },
      include: {
        categories: {
          include: {
            category: true, // Include category details if needed
          },
        },
      },
      skip: (page - 1) * pageSize, // Pagination calculation
      take: pageSize, // Limit the result to pageSize
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
export const verifyStore = async (req: Request, res: Response) => {
  const { storeId } = req.params; // Assume the storeId is passed as a URL parameter
  
  try {
    // Find the store by its id
    const store = await prisma.store.update({
      where: {
        id: Number(storeId), // Convert storeId to number
      },
      data: {
        isVerified: true, // Set the 'isVerified' field to true
      },
    });

    // Respond with the updated store details
     res.json({
      success: true,
      message: 'Store successfully verified.',
      data: store,
    });
    return
  } catch (error:any) {
    // Handle error if the store was not found or other errors occur
    console.error(error);
     res.status(500).json({
      success: false,
      message: 'Failed to verify store.',
      error: error.message,
    });
    return
  }
};
export const getUnverifyStore = async (req: Request, res: Response) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        isVerified: false,
      },
      include: {
        categories: {
          include: {
            category: true, // Include the category details
          },
        },
      },
    });

     res.json({ stores });
     return
  } catch (error) {
    console.error('Error fetching unverified stores:', error);
    res.status(500).json({ message: 'Error fetching unverified stores' });
  }
};

export const getLatestById = async (req: Request, res: Response) => {
  const { id } = req.params;  // Extract the ID from the request parameters

  try {
    const latest = await prisma.latest.findUnique({
      where: {
        id: Number(id),  // Ensure the ID is a number
      },
    });

    if (latest) {
      res.status(200).json(latest);  // Return the found record
    } else {
      res.status(404).json({ message: 'Latest not found' });  // If no record found
    }
  } catch (error) {
    console.error('Error fetching latest by ID:', error);
    res.status(500).json({
      message: 'An error occurred while fetching the latest record.',
    });
  }
};
