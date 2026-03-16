import { Router } from 'express';
import adminAuth from '#backend/middlewares/adminAuth.js';
import { upload } from '#backend/config/upload.js';
import {
  adminLogin,
  adminLogout,
  getDashboardStats,
  getEventSettings,
  updateEventSettings,
  getAllPasses,
  createPass,
  updatePass,
  deletePass,
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getAllVolunteers,
  updateVolunteerStatus,
  deleteVolunteer,
  getAllExhibitors,
  updateExhibitorStatus,
  deleteExhibitor,
  getAllBookings,
  getBookingById,
} from '#backend/controllers/adminController.js';
import {
  getAllSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
} from '#backend/controllers/sponsorController.js';

const router = Router();

// ── Auth (public) ───────────────────────────────────
router.post('/login', adminLogin);
router.post('/logout', adminLogout);

// ── All routes below require admin JWT ──────────────
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Event settings
router.get('/settings', getEventSettings);
router.put(
  '/settings',
  upload.fields([
    { name: 'navbarLogo', maxCount: 1 },
    { name: 'homePassesImage', maxCount: 1 },
    { name: 'homeVolunteerImage', maxCount: 1 },
    { name: 'homeSponsorImage', maxCount: 1 },
  ]),
  updateEventSettings
);

// Passes
router.get('/passes', getAllPasses);
router.post('/passes', createPass);
router.put('/passes/:id', updatePass);
router.delete('/passes/:id', deletePass);

// Activities
router.get('/activities', getAllActivities);
router.post('/activities', upload.single('image'), createActivity);
router.put('/activities/:id', upload.single('image'), updateActivity);
router.delete('/activities/:id', deleteActivity);

// Promo Codes
router.get('/promo-codes', getAllPromoCodes);
router.post('/promo-codes', createPromoCode);
router.put('/promo-codes/:id', updatePromoCode);
router.delete('/promo-codes/:id', deletePromoCode);

// Volunteers
router.get('/volunteers', getAllVolunteers);
router.patch('/volunteers/:id/status', updateVolunteerStatus);
router.delete('/volunteers/:id', deleteVolunteer);

// Exhibitors
router.get('/exhibitors', getAllExhibitors);
router.patch('/exhibitors/:id/status', updateExhibitorStatus);
router.delete('/exhibitors/:id', deleteExhibitor);

// Bookings
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);

// Sponsors
router.get('/sponsors', getAllSponsors);
router.post('/sponsors', upload.single('logo'), createSponsor);
router.put('/sponsors/:id', upload.single('logo'), updateSponsor);
router.delete('/sponsors/:id', deleteSponsor);

export default router;
