import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Generate a PDF ticket buffer for a confirmed booking.
 * Returns a Promise<Buffer>.
 */
const generateTicketPdf = async (booking) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // QR code data
      const qrData = JSON.stringify({
        bookingId: booking._id,
        paymentId: booking.razorpayPaymentId,
        name: booking.customerName,
      });
      const qrImageDataUrl = await QRCode.toDataURL(qrData, { width: 150 });
      const qrBuffer = Buffer.from(qrImageDataUrl.split(',')[1], 'base64');

      // Header
      doc.fontSize(28).font('Helvetica-Bold').text('KidsFest', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica').text('Event Ticket', { align: 'center' });
      doc.moveDown(1);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#E91E63')
        .lineWidth(2)
        .stroke();
      doc.moveDown(1);

      // Booking details
      const leftX = 50;
      doc.fontSize(11).font('Helvetica-Bold');

      const addRow = (label, value) => {
        doc.font('Helvetica-Bold').text(`${label}: `, leftX, doc.y, { continued: true });
        doc.font('Helvetica').text(value);
        doc.moveDown(0.4);
      };

      addRow('Booking ID', String(booking._id));
      addRow('Name', booking.customerName);
      addRow('Email', booking.customerEmail);
      addRow('Phone', booking.customerPhone);
      addRow('Payment ID', booking.razorpayPaymentId || 'N/A');
      doc.moveDown(0.5);

      // Passes table
      doc.font('Helvetica-Bold').fontSize(13).text('Passes', leftX);
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Pass', leftX, doc.y, { width: 200, continued: false });

      for (const p of booking.passesPurchased) {
        doc.font('Helvetica').fontSize(10);
        const line = `${p.passName}  ×${p.quantity}  —  ₹${(p.pricePaidPerPass * p.quantity).toFixed(2)}`;
        doc.text(line, leftX);
        doc.moveDown(0.2);
      }

      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(`Total Paid: ₹${booking.totalAmount.toFixed(2)}`, leftX);
      doc.moveDown(1.5);

      // QR code
      doc.image(qrBuffer, (doc.page.width - 150) / 2, doc.y, { width: 150 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export { generateTicketPdf };
