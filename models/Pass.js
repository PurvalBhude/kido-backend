import mongoose from 'mongoose';

const passSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pass name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    regularPrice: {
      type: Number,
      required: [true, 'Regular price is required'],
      min: [0, 'Price cannot be negative'],
    },
    earlyBirdPrice: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    isEarlyBirdActive: {
      type: Boolean,
      default: false,
    },
    isRegistrationOpen: {
      type: Boolean,
      default: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    minQuantityForDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bulkDiscountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

passSchema.virtual('available').get(function () {
  return this.capacity - this.sold;
});

passSchema.set('toJSON', { virtuals: true });

const Pass = mongoose.model('Pass', passSchema);

export default Pass;
