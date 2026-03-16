import { v2 as cloudinary } from 'cloudinary';

let _configured = false;

/**
 * Lazy-configure Cloudinary so env vars are guaranteed to be loaded.
 */
const getCloudinary = () => {
  if (!_configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    _configured = true;
  }
  return cloudinary;
};

export { getCloudinary };
