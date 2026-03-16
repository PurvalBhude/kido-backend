import { Router } from 'express';
import publicRoutes from '#backend/routes/publicRoutes.js';
import checkoutRoutes from '#backend/routes/checkoutRoutes.js';
import adminRoutes from '#backend/routes/adminRoutes.js';

const router = Router();

router.use('/public', publicRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/admin', adminRoutes);

export default router;
