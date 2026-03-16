import jwt from 'jsonwebtoken';
import User from '#backend/models/User.js';
import EventSettings from '#backend/models/EventSettings.js';
import Pass from '#backend/models/Pass.js';
import Booking from '#backend/models/Booking.js';
import PromoCode from '#backend/models/PromoCode.js';
import Activity from '#backend/models/Activity.js';
import Volunteer from '#backend/models/Volunteer.js';
import Exhibitor from '#backend/models/Exhibitor.js';
import { setAuthCookie, clearAuthCookie } from '#backend/utils/cookieHelper.js';
import { uploadToCloudinary } from '#backend/config/upload.js';

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/login
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { adminId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    setAuthCookie(res, 'adminToken', token);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/logout
 */
export const adminLogout = async (req, res) => {
  clearAuthCookie(res, 'adminToken');
  return res.status(200).json({ success: true, message: 'Logged out' });
};

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/dashboard
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const [revenueAgg, ticketAgg, volunteersPending, exhibitorsPending] = await Promise.all([
      Booking.aggregate([
        { $match: { paymentStatus: 'Success' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { paymentStatus: 'Success' } },
        { $unwind: '$passesPurchased' },
        { $group: { _id: null, total: { $sum: '$passesPurchased.quantity' } } },
      ]),
      Volunteer.countDocuments({ status: 'Pending' }),
      Exhibitor.countDocuments({ status: 'Pending' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: revenueAgg[0]?.total || 0,
        totalTicketsSold: ticketAgg[0]?.total || 0,
        volunteersPending,
        exhibitorsPending,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  EVENT SETTINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/settings
 */
export const getEventSettings = async (req, res, next) => {
  try {
    const settings = await EventSettings.getInstance();
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings
 */
export const updateEventSettings = async (req, res, next) => {
  try {
    const allowedFields = [
      'isGlobalRegistrationOpen',
      'isGlobalEarlyBirdActive',
      'eventName',
      'eventDates',
      'venue',
      'announcementBanner',
      'isBannerActive',
      'eventDescription',
      'heroVideoLink',
      'locationMapLink',
      'sponsorshipOpportunities',
      'isSponsorshipOpen',
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        // If "null" is passed from FormData, treat it as empty string
        updates[key] = req.body[key] === 'null' ? '' : req.body[key];
      }
    }

    // Process file uploads if present (via multer upload.fields)
    // multer puts files like req.files['navbarLogo'][0]
    if (req.files) {
      const fileFields = ['navbarLogo', 'homePassesImage', 'homeVolunteerImage', 'homeSponsorImage'];
      for (const field of fileFields) {
        if (req.files[field] && req.files[field][0]) {
          const file = req.files[field][0];
          updates[field] = await uploadToCloudinary(file.buffer, 'kidsfest/settings');
        }
      }
    }

    const settings = await EventSettings.findOneAndUpdate({}, updates, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PASS CRUD
// ═══════════════════════════════════════════════════════════════════

/** GET /api/admin/passes */
export const getAllPasses = async (req, res, next) => {
  try {
    const passes = await Pass.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: passes });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/passes */
export const createPass = async (req, res, next) => {
  try {
    const pass = await Pass.create(req.body);
    return res.status(201).json({ success: true, data: pass });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/admin/passes/:id */
export const updatePass = async (req, res, next) => {
  try {
    const pass = await Pass.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });
    return res.status(200).json({ success: true, data: pass });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/passes/:id */
export const deletePass = async (req, res, next) => {
  try {
    const pass = await Pass.findByIdAndDelete(req.params.id);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });
    return res.status(200).json({ success: true, message: 'Pass deleted' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  ACTIVITY CRUD
// ═══════════════════════════════════════════════════════════════════

/** GET /api/admin/activities */
export const getAllActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/activities */
export const createActivity = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.imageUrl = await uploadToCloudinary(req.file.buffer, 'kidsfest/activities');
    }
    const activity = await Activity.create(req.body);
    return res.status(201).json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/admin/activities/:id */
export const updateActivity = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.imageUrl = await uploadToCloudinary(req.file.buffer, 'kidsfest/activities');
    }
    const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    return res.status(200).json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/activities/:id */
export const deleteActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    return res.status(200).json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PROMO CODE CRUD
// ═══════════════════════════════════════════════════════════════════

/** GET /api/admin/promo-codes */
export const getAllPromoCodes = async (req, res, next) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: codes });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/promo-codes */
export const createPromoCode = async (req, res, next) => {
  try {
    const promo = await PromoCode.create(req.body);
    return res.status(201).json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/admin/promo-codes/:id */
export const updatePromoCode = async (req, res, next) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo code not found' });
    return res.status(200).json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/promo-codes/:id */
export const deletePromoCode = async (req, res, next) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: 'Promo code not found' });
    return res.status(200).json({ success: true, message: 'Promo code deleted' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  VOLUNTEER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/** GET /api/admin/volunteers */
export const getAllVolunteers = async (req, res, next) => {
  try {
    const volunteers = await Volunteer.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: volunteers });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/volunteers/:id/status */
export const updateVolunteerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    return res.status(200).json({ success: true, data: volunteer });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/volunteers/:id */
export const deleteVolunteer = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findByIdAndDelete(req.params.id);
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    return res.status(200).json({ success: true, message: 'Volunteer deleted' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  EXHIBITOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/** GET /api/admin/exhibitors */
export const getAllExhibitors = async (req, res, next) => {
  try {
    const exhibitors = await Exhibitor.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: exhibitors });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/exhibitors/:id/status */
export const updateExhibitorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const exhibitor = await Exhibitor.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!exhibitor) return res.status(404).json({ success: false, message: 'Exhibitor not found' });
    return res.status(200).json({ success: true, data: exhibitor });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/exhibitors/:id */
export const deleteExhibitor = async (req, res, next) => {
  try {
    const exhibitor = await Exhibitor.findByIdAndDelete(req.params.id);
    if (!exhibitor) return res.status(404).json({ success: false, message: 'Exhibitor not found' });
    return res.status(200).json({ success: true, message: 'Exhibitor deleted' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  BOOKINGS (read-only for admin)
// ═══════════════════════════════════════════════════════════════════

/** GET /api/admin/bookings */
export const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.paymentStatus = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/bookings/:id */
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};
