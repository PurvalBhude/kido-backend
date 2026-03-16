import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize the nodemailer transporter.
 * Call once at server startup.
 */
const initializeTransporter = async () => {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Verify connection
  await transporter.verify();
  return transporter;
};

/**
 * Send a booking confirmation email with an attached PDF ticket.
 */
const sendBookingConfirmation = async ({ to, customerName, booking, pdfBuffer }) => {
  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }

  const passDetails = booking.passesPurchased
    .map(
      (p) =>
        `• ${p.passName} x${p.quantity} — ₹${(p.pricePaidPerPass * p.quantity).toFixed(2)}`
    )
    .join('\n');

  const mailOptions = {
    from: `"KidsFest" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `🎪 Your KidsFest Booking Confirmation — #${booking._id}`,
    text: [
      `Hi ${customerName},`,
      '',
      'Thank you for booking with KidsFest! Here are your details:',
      '',
      `Booking ID: ${booking._id}`,
      `Payment ID: ${booking.razorpayPaymentId}`,
      '',
      'Passes:',
      passDetails,
      '',
      `Total Paid: ₹${booking.totalAmount.toFixed(2)}`,
      '',
      'Your ticket is attached as a PDF. Please bring it to the venue.',
      '',
      'See you at the fest! 🎉',
      '— Team KidsFest',
    ].join('\n'),
    attachments: pdfBuffer
      ? [
          {
            filename: `KidsFest-Ticket-${booking._id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [],
  };

  return transporter.sendMail(mailOptions);
};

export { initializeTransporter, sendBookingConfirmation };
