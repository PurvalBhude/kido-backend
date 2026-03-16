import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    tier: {
      type: String,
      enum: ['Title Sponsor', 'Gold Sponsor', 'Silver Sponsor', 'Stall / Booth', 'Food Partner', 'Other'],
      default: 'Other',
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Sponsor = mongoose.model('Sponsor', sponsorSchema);

export default Sponsor;
