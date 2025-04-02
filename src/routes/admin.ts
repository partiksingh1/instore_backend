import { Router } from 'express';
import { batchproducts, createAd, createLatest, createNewsletter, createScrollBar, createWindow, deleteAd, deleteLatest, deleteNewsletter, deleteWindow, fetchAds, fetchAdsByPosition, getAllNewsletters, getLatest, getLatestScrollBarText, getStoreEmailsByCountryAndCategories, getWindows, sendNewsletterEmail, updateScrollBar } from '../controllers/adminController.js';
import { addProduct, deleteProduct, editProduct, getProductsInCategory } from '../controllers/categoryController.js';
import { createVideo, deleteVideo, getVideos, processVideo, } from '../controllers/videoController.js';
import { getLatestById, getUnverifyStore, verifyStore } from '../controllers/storeController.js';


const adminRouter = Router();

// Sign-up route
adminRouter.post("/admin/ads", createAd); // Route for creating an ad
adminRouter.delete("/admin/ads/:id", deleteAd); // Route for deleting an ad
adminRouter.get("/admin/ads", fetchAds); // Route for fetching ads
adminRouter.get("/admin/ad", fetchAdsByPosition); // Route for fetching ads
adminRouter.post('/admin/latest', createLatest);
adminRouter.get('/admin/latest', getLatest);
adminRouter.get('/admin/latest/:id', getLatestById);
adminRouter.delete('/admin/latest/:id', deleteLatest);
adminRouter.post('/admin/products', addProduct);
adminRouter.put('/admin/products/:id', editProduct);
adminRouter.delete('/admin/products/:id', deleteProduct);
adminRouter.get('/admin/category/:categoryName/products', getProductsInCategory);
adminRouter.post('/admin/batch/products', batchproducts);
adminRouter.post('/admin/newsletter/create', createNewsletter);
adminRouter.get('/admin/newsletter', getAllNewsletters);
adminRouter.delete('/admin/newsletter/:id', deleteNewsletter);
adminRouter.post('/admin/newsletter/:id/send', sendNewsletterEmail);
adminRouter.post('/admin/videos', createVideo);
adminRouter.get('/admin/videos', getVideos);
adminRouter.delete('/admin/videos/:id', deleteVideo);
adminRouter.post('/process-video', processVideo);
adminRouter.post('/admin/create-window', createWindow);
adminRouter.get('/windows', getWindows);
adminRouter.delete('/admin/window/:id', deleteWindow);
adminRouter.put('/admin/store/:storeId/verify', verifyStore);
adminRouter.get('/admin/stores/unverified', getUnverifyStore);
adminRouter.post('/admin/scrollBar', createScrollBar);
adminRouter.put('/admin/scrollBar/:id', updateScrollBar);
adminRouter.get('/admin/scrollBar/latest', getLatestScrollBarText);
adminRouter.post('/admin/getStores', getStoreEmailsByCountryAndCategories);
export default adminRouter;