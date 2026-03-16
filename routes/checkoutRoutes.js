import { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  validatePromoCode,
} from '#backend/controllers/checkoutController.js';

const router = Router();

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.post('/validate-promo', validatePromoCode);

export default router;
