import { Router } from 'express';
import { fetchStoresByCategoryAndCountry, fetchWandDByCategoryAndCountry } from "../controllers/storeController.js";
import {createCategory, deleteCategory, fetchCategories } from '../controllers/categoryController.js';

const storeRouter = Router();

// Define the route for fetching stores by category and country
storeRouter.get("/stores/:category/:country", fetchStoresByCategoryAndCountry);
storeRouter.get("/WandD/:category/:country", fetchWandDByCategoryAndCountry);
storeRouter.get("/categories", fetchCategories);
storeRouter.post("/categories", createCategory);
storeRouter.delete("/categories/:id", deleteCategory);

export default storeRouter