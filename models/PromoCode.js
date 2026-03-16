import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Promo code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    maxUses: {
      type: Number,
      default: 0, // 0 = unlimited
      min: 0,
    },
    timesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

promoCodeSchema.index({ code: 1 });

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode;
