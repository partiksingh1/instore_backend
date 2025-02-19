import multer from 'multer';

// Set up multer to store files temporarily
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // Make sure you have the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);  // Unique file name
  },
});

const upload = multer({ storage }).single('image');  // 'image' is the field name from your form

export const uploadImage = upload; // Export the middleware
