import EventSettings from '#backend/models/EventSettings.js';
import Activity from '#backend/models/Activity.js';
import Pass from '#backend/models/Pass.js';
import Volunteer from '#backend/models/Volunteer.js';
import Exhibitor from '#backend/models/Exhibitor.js';
import { uploadToCloudinary } from '#backend/config/upload.js';

// ─── GET PUBLIC DATA ────────────────────────────────────────────────

/**
 * Fetch event settings and active activities for the landing page.
 * GET /api/public/data
 */
export const getPublicData = async (req, res, next) => {
  try {
    const [settings, activities] = await Promise.all([
      EventSettings.getInstance(),
      Activity.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        settings: {
          eventName: settings.eventName,
          eventDates: settings.eventDates,
          venue: settings.venue,
          isGlobalRegistrationOpen: settings.isGlobalRegistrationOpen,
          announcementBanner: settings.isBannerActive ? settings.announcementBanner : null,
          eventDescription: settings.eventDescription,
          heroVideoLink: settings.heroVideoLink,
          locationMapLink: settings.locationMapLink,
          sponsorshipOpportunities: settings.sponsorshipOpportunities,
          navbarLogo: settings.navbarLogo,
          homePassesImage: settings.homePassesImage,
          homeVolunteerImage: settings.homeVolunteerImage,
          homeSponsorImage: settings.homeSponsorImage,
          isSponsorshipOpen: settings.isSponsorshipOpen,
        },
        activities,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET PASSES ─────────────────────────────────────────────────────

/**
 * Fetch all passes with correct price based on early-bird rules.
 * Early bird price is exposed ONLY when BOTH global + per-pass flags are active.
 * GET /api/public/passes
 */
export const getPasses = async (req, res, next) => {
  try {
    const [settings, passes] = await Promise.all([
      EventSettings.getInstance(),
      Pass.find({ isRegistrationOpen: true }).lean(),
    ]);

    const isGlobalEarlyBird = settings.isGlobalEarlyBirdActive;

    const enrichedPasses = passes.map((pass) => {
      const earlyBirdApplies = isGlobalEarlyBird && pass.isEarlyBirdActive;
      const effectivePrice = earlyBirdApplies ? pass.earlyBirdPrice : pass.regularPrice;

      return {
        _id: pass._id,
        name: pass.name,
        description: pass.description,
        price: effectivePrice,
        regularPrice: pass.regularPrice,
        isEarlyBird: earlyBirdApplies,
        ...(earlyBirdApplies && { earlyBirdPrice: pass.earlyBirdPrice }),
        available: pass.capacity - pass.sold,
        capacity: pass.capacity,
        minQuantityForDiscount: pass.minQuantityForDiscount,
        bulkDiscountPercentage: pass.bulkDiscountPercentage,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        isRegistrationOpen: settings.isGlobalRegistrationOpen,
        passes: enrichedPasses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── SUBMIT VOLUNTEER ───────────────────────────────────────────────

/**
 * Save a new volunteer registration.
 * POST /api/public/volunteer
 */
export const submitVolunteer = async (req, res, next) => {
  try {
    const { fullName, email, phone, preferredRole } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'fullName, email, and phone are required',
      });
    }

    const volunteer = await Volunteer.create({ fullName, email, phone, preferredRole });

    return res.status(201).json({
      success: true,
      message: 'Volunteer registration submitted successfully',
      data: volunteer,
    });
  } catch (error) {
    next(error);
  }
};

// ─── SUBMIT EXHIBITOR ───────────────────────────────────────────────

/**
 * Save a new exhibitor / sponsor enquiry.
 * POST /api/public/exhibitor
 */
export const submitExhibitor = async (req, res, next) => {
  try {
    const { brandName, contactPerson, email, phone, interestTier } = req.body;

    if (!brandName || !contactPerson || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'brandName, contactPerson, email, and phone are required',
      });
    }

    // brochureUrl comes from Cloudinary upload (if file present)
    let brochureUrl = req.body.brochureUrl || '';
    if (req.file) {
      brochureUrl = await uploadToCloudinary(req.file.buffer, 'kidsfest/brochures');
    }

    const exhibitor = await Exhibitor.create({
      brandName,
      contactPerson,
      email,
      phone,
      interestTier,
      brochureUrl,
    });

    return res.status(201).json({
      success: true,
      message: 'Exhibitor enquiry submitted successfully',
      data: exhibitor,
    });
  } catch (error) {
    next(error);
  }
};
