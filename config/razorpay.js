import Razorpay from 'razorpay';

let _instance = null;

/**
 * Lazy-initialize Razorpay so env vars are guaranteed to be loaded.
 */
const getRazorpayInstance = () => {
  if (!_instance) {
    _instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _instance;
};

export default getRazorpayInstance;
