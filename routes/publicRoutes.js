import { Router } from 'express';
import { upload } from '#backend/config/upload.js';
import {
  getPublicData,
  getPasses,
  submitVolunteer,
  submitExhibitor,
} from '#backend/controllers/publicController.js';
import { getActiveSponsors } from '#backend/controllers/sponsorController.js';

const router = Router();

router.get('/data', getPublicData);
router.get('/passes', getPasses);
router.post('/volunteer', submitVolunteer);
router.get('/sponsors', getActiveSponsors);
router.post('/exhibitor', upload.single('brochure'), submitExhibitor);

export default router;
