import crypto from 'crypto';
import EventSettings from '#backend/models/EventSettings.js';
import Pass from '#backend/models/Pass.js';
import Booking from '#backend/models/Booking.js';
import PromoCode from '#backend/models/PromoCode.js';
import getRazorpayInstance from '#backend/config/razorpay.js';
import { generateTicketPdf } from '#backend/utils/pdfGenerator.js';
import { sendBookingConfirmation } from '#backend/utils/emailService.js';
import logger from '#backend/config/logger.js';

// ─── HELPER: resolve effective price for a pass ─────────────────────

const getEffectivePrice = (pass, isGlobalEarlyBird) => {
  const earlyBird = isGlobalEarlyBird && pass.isEarlyBirdActive;
  return earlyBird ? pass.earlyBirdPrice : pass.regularPrice;
};

// ─── CREATE ORDER ───────────────────────────────────────────────────

/**
 * POST /api/checkout/create-order
 * Body: { customerName, customerEmail, customerPhone, items: [{ passId, quantity }], promoCode? }
 */
export const createOrder = async (req, res, next) => {
  try {
    const { customerName, customerEmail, customerPhone, items, promoCode } = req.body;

    // 1) Basic validation
    if (!customerName || !customerEmail || !customerPhone || !items?.length) {
      return res.status(400).json({
        success: false,
        message: 'customerName, customerEmail, customerPhone and items are required',
      });
    }

    // 2) Check global registration
    const settings = await EventSettings.getInstance();
    if (!settings.isGlobalRegistrationOpen) {
      return res.status(403).json({
        success: false,
        message: 'Registrations are currently closed',
      });
    }

    const isGlobalEarlyBird = settings.isGlobalEarlyBirdActive;

    // 3) Validate passes, check capacity, calculate amount
    let subtotal = 0;
    const passesPurchased = [];

    for (const item of items) {
      const pass = await Pass.findById(item.passId);
      if (!pass) {
        return res.status(404).json({
          success: false,
          message: `Pass not found: ${item.passId}`,
        });
      }

      if (!pass.isRegistrationOpen) {
        return res.status(400).json({
          success: false,
          message: `Registration closed for pass: ${pass.name}`,
        });
      }

      const available = pass.capacity - pass.sold;
      if (item.quantity > available) {
        return res.status(400).json({
          success: false,
          message: `Only ${available} tickets available for ${pass.name}`,
        });
      }

      let pricePerPass = getEffectivePrice(pass, isGlobalEarlyBird);

      // Apply bulk/group discount if eligible
      if (
        pass.bulkDiscountPercentage > 0 &&
        pass.minQuantityForDiscount > 0 &&
        item.quantity >= pass.minQuantityForDiscount
      ) {
        pricePerPass = pricePerPass * (1 - pass.bulkDiscountPercentage / 100);
      }

      // Round to 2 decimals
      pricePerPass = Math.round(pricePerPass * 100) / 100;

      subtotal += pricePerPass * item.quantity;

      passesPurchased.push({
        passId: pass._id,
        passName: pass.name,
        quantity: item.quantity,
        pricePaidPerPass: pricePerPass,
      });
    }

    // 4) Validate and apply promo code
    let promoDoc = null;
    let discountAmount = 0;

    if (promoCode) {
      promoDoc = await PromoCode.findOne({
        code: promoCode.toUpperCase(),
        isActive: true,
      });

      if (!promoDoc) {
        return res.status(400).json({ success: false, message: 'Invalid promo code' });
      }

      if (promoDoc.validUntil && new Date() > promoDoc.validUntil) {
        return res.status(400).json({ success: false, message: 'Promo code has expired' });
      }

      if (promoDoc.maxUses > 0 && promoDoc.timesUsed >= promoDoc.maxUses) {
        return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
      }

      if (promoDoc.discountType === 'percentage') {
        discountAmount = Math.round(subtotal * (promoDoc.discountValue / 100) * 100) / 100;
      } else {
        discountAmount = promoDoc.discountValue;
      }
    }

    const totalAmount = Math.max(Math.round((subtotal - discountAmount) * 100) / 100, 0);

    // 5) Create Razorpay order (amount in paise)
    const razorpayOrder = await getRazorpayInstance().orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { customerEmail },
    });

    // 6) Persist pending Booking
    const booking = await Booking.create({
      customerName,
      customerEmail,
      customerPhone,
      passesPurchased,
      totalAmount,
      promoCodeUsed: promoDoc?._id || null,
      discountAmount,
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'Pending',
    });

    return res.status(201).json({
      success: true,
      data: {
        bookingId: booking._id,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── VERIFY PAYMENT ─────────────────────────────────────────────────

/**
 * POST /api/checkout/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // 1) Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Mark booking as failed
      await Booking.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { paymentStatus: 'Failed' }
      );
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // 2) Update booking
    const booking = await Booking.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, paymentStatus: 'Pending' },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: 'Success',
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or already processed' });
    }

    // 3) Increment sold counts atomically
    const bulkOps = booking.passesPurchased.map((p) => ({
      updateOne: {
        filter: { _id: p.passId },
        update: { $inc: { sold: p.quantity } },
      },
    }));
    await Pass.bulkWrite(bulkOps);

    // 4) Increment promo code usage
    if (booking.promoCodeUsed) {
      await PromoCode.findByIdAndUpdate(booking.promoCodeUsed, {
        $inc: { timesUsed: 1 },
      });
    }

    // 5) Generate PDF ticket & send email (fire-and-forget for speed)
    setImmediate(async () => {
      try {
        const pdfBuffer = await generateTicketPdf(booking);
        await sendBookingConfirmation({
          to: booking.customerEmail,
          customerName: booking.customerName,
          booking,
          pdfBuffer,
        });
        logger.info(`Confirmation email sent to ${booking.customerEmail}`);
      } catch (emailErr) {
        logger.error('Email/PDF generation error:', emailErr.message);
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── VALIDATE PROMO CODE (public helper) ────────────────────────────

/**
 * POST /api/checkout/validate-promo
 * Body: { code }
 */
export const validatePromoCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });

    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid promo code' });
    }
    if (promo.validUntil && new Date() > promo.validUntil) {
      return res.status(400).json({ success: false, message: 'Promo code has expired' });
    }
    if (promo.maxUses > 0 && promo.timesUsed >= promo.maxUses) {
      return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
    }

    return res.status(200).json({
      success: true,
      data: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    });
  } catch (error) {
    next(error);
  }
};
