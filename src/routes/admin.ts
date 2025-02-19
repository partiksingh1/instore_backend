import { Router } from 'express';
import { batchproducts, createAd, createNewsletter, deleteAd, deleteNewsletter, fetchAds, fetchAdsByPosition, getNewsletters } from '../controllers/adminController.js';
import { addProduct, deleteProduct, editProduct, getProductsInCategory } from '../controllers/categoryController.js';


const adminRouter = Router();

// Sign-up route
adminRouter.post("/admin/ads", createAd); // Route for creating an ad
adminRouter.delete("/admin/ads/:id", deleteAd); // Route for deleting an ad
adminRouter.get("/admin/ads", fetchAds); // Route for fetching ads
adminRouter.get("/admin/ad", fetchAdsByPosition); // Route for fetching ads
adminRouter.post('/admin/newsletters', createNewsletter);
adminRouter.get('/admin/newsletters', getNewsletters);
adminRouter.delete('/admin/newsletters/:id', deleteNewsletter);
adminRouter.post('/admin/products', addProduct);
adminRouter.put('/admin/products/:id', editProduct);
adminRouter.delete('/admin/products/:id', deleteProduct);
adminRouter.get('/admin/category/:categoryName/products', getProductsInCategory);
adminRouter.post('/admin/batch/products', batchproducts);

export default adminRouter;