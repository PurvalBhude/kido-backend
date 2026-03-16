import multer from 'multer';
import { getCloudinary } from './cloudinary.js';

// Use memory storage — files stay in RAM as Buffer, never touch disk.
// Perfect for free-tier deployments (Render, Railway, Vercel) with no persistent FS.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (allowed.test(ext) && allowed.test(file.mimetype.split('/').pop())) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, gif, webp) and PDFs are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Upload a multer file buffer to Cloudinary.
 * Returns the Cloudinary secure URL.
 */
const uploadToCloudinary = (fileBuffer, folder = 'kidsfest') => {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

export { upload, uploadToCloudinary };
