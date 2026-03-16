import Sponsor from '#backend/models/Sponsor.js';
import { uploadToCloudinary } from '#backend/config/upload.js';

// ─── GET ALL SPONSORS (Admin) ───────────────────────────────────────

export const getAllSponsors = async (req, res, next) => {
  try {
    const sponsors = await Sponsor.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: sponsors });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE SPONSOR (Admin) ─────────────────────────────────────────

export const createSponsor = async (req, res, next) => {
  try {
    const { brandName, tier, website, description, isActive } = req.body;

    if (!brandName) {
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    let logoUrl = '';
    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file.buffer, 'kidsfest/sponsors');
    }

    const sponsor = await Sponsor.create({
      brandName,
      logoUrl,
      tier: tier || 'Other',
      website: website || '',
      description: description || '',
      isActive: isActive !== 'false',
    });

    return res.status(201).json({ success: true, data: sponsor });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE SPONSOR (Admin) ─────────────────────────────────────────

export const updateSponsor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brandName, tier, website, description, isActive } = req.body;

    const sponsor = await Sponsor.findById(id);
    if (!sponsor) {
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }

    if (brandName !== undefined) sponsor.brandName = brandName;
    if (tier !== undefined) sponsor.tier = tier;
    if (website !== undefined) sponsor.website = website;
    if (description !== undefined) sponsor.description = description;
    if (isActive !== undefined) sponsor.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      sponsor.logoUrl = await uploadToCloudinary(req.file.buffer, 'kidsfest/sponsors');
    }

    await sponsor.save();
    return res.status(200).json({ success: true, data: sponsor });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE SPONSOR (Admin) ─────────────────────────────────────────

export const deleteSponsor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sponsor = await Sponsor.findByIdAndDelete(id);
    if (!sponsor) {
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }
    return res.status(200).json({ success: true, message: 'Sponsor deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── GET ACTIVE SPONSORS (Public) ───────────────────────────────────

export const getActiveSponsors = async (req, res, next) => {
  try {
    const sponsors = await Sponsor.find({ isActive: true })
      .select('brandName logoUrl tier website description')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: sponsors });
  } catch (error) {
    next(error);
  }
};
