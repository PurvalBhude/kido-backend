import mongoose from 'mongoose';

const passItemSchema = new mongoose.Schema(
  {
    passId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pass',
      required: true,
    },
    passName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePaidPerPass: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
    },
    passesPurchased: {
      type: [passItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one pass must be purchased',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    promoCodeUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },
    ticketPdfUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ razorpayOrderId: 1 });
bookingSchema.index({ customerEmail: 1 });
bookingSchema.index({ paymentStatus: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
