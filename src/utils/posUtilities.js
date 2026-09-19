import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { DEFAULT_BUSINESS_INFO } from '../data/businessProfile';
import { billTotalsFor, invoiceItems, lineAmount } from './billTotals';

// jsPDF's built-in fonts have no ₹ glyph, so the PDF writes out "Rs."
const PDF_CURRENCY = 'Rs. ';
const pdfMoney = (value) => `${PDF_CURRENCY}${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;
// ASCII only: a Unicode minus pushes jsPDF into UTF-16 strings that the
// standard font may not have a glyph for
const pdfSigned = (value) => (value < 0 ? `(-) ${pdfMoney(Math.abs(value))}` : pdfMoney(value));

/** One filename for the downloaded bill and the shared attachment. */
export function invoiceFileName(invoice = {}, business = {}) {
  const profile = { ...DEFAULT_BUSINESS_INFO, ...business };
  const prefix = String(profile.name || '').trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${prefix ? `${prefix}-` : ''}${invoice.id || 'Invoice'}`;
}

/**
 * 1. Generate the UPI payment QR as a data URL.
 * Returns null when no VPA is configured — a bill must never point a customer
 * at a payment address the business does not own.
 * @param {string} upiId - Merchant UPI VPA
 * @param {string} payeeName - Merchant name shown in the payee field
 * @param {number} amount - Exact invoice amount to pre-fill
 * @param {string} invoiceId - Invoice reference number
 * @returns {Promise<string|null>} Data URL of the QR code PNG
 */
export async function generateUpiQrCodeDataUrl(upiId = '', payeeName = DEFAULT_BUSINESS_INFO.name, amount = 0, invoiceId = '') {
  if (!upiId) return null;

  const cleanAmount = Number(amount || 0).toFixed(2);
  const note = `Invoice ${invoiceId || 'Payment'}`;

  // Standard NPCI UPI URI Specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

  try {
    return await QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: {
        dark: '#1E1B4B', // matches the app's indigo ink
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return null;
  }
}

// Load the business logo as an embeddable data URL; null keeps the bill usable
// when the asset is missing.
async function loadLogo(path) {
  if (!path) return null;
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const size = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    return size && size.width ? { dataUrl, ...size } : null;
  } catch {
    return null;
  }
}

/**
 * 2. Build the invoice PDF: the same document the customer sees on screen,
 * laid out for A5 with the business logo, its own header and no app branding.
 * @param {Object} invoice - Invoice details & item lines
 * @param {Object} [business] - Business profile (name, logo, gstin, city, phone, upiId)
 * @returns {Promise<jsPDF>} jsPDF document instance
 */
export async function generateInvoicePdf(invoice = {}, business = {}) {
  const profile = { ...DEFAULT_BUSINESS_INFO, ...business };
  // compress: the logo and the payment QR are embedded images — a shared bill
  // should not be a third of a megabyte on a phone's data plan
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5', compress: true });

  // The document's own identity: no app name in the page header, the file's
  // properties or the save-as name
  doc.setProperties({
    title: `Invoice ${invoice.id || 'INV-001'} - ${profile.name}`,
    subject: 'Tax Invoice',
    author: profile.name,
    creator: profile.name,
    keywords: [invoice.id, profile.name, invoice.date].filter(Boolean).join(', ')
  });

  const M = 12;              // page margin
  const W = doc.internal.pageSize.getWidth();   // 148mm
  const H = doc.internal.pageSize.getHeight();  // 210mm
  const RIGHT = W - M;
  const INK = [30, 27, 75];      // indigo
  const MUTED = [100, 116, 139]; // slate
  const BODY = [30, 41, 59];

  const items = invoiceItems(invoice);
  const totals = billTotalsFor(invoice, profile);

  const drawTableHead = (y) => {
    doc.setFillColor(...INK);
    doc.rect(M, y, RIGHT - M, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', M + 2, y + 4.8);
    doc.text('ITEM & DESCRIPTION', M + 9, y + 4.8);
    doc.text('QTY', M + 78, y + 4.8, { align: 'right' });
    doc.text('RATE', M + 102, y + 4.8, { align: 'right' });
    doc.text('AMOUNT', RIGHT - 2, y + 4.8, { align: 'right' });
    return y + 7;
  };

  let y = M;

  // Header: logo + business details (left), invoice title + total (right)
  const logo = await loadLogo(profile.logo);
  if (logo) {
    const logoW = 24;
    const logoH = Math.min(24, logoW * (logo.height / logo.width));
    doc.addImage(logo.dataUrl, 'PNG', M, y, logoW, logoH);
    y += logoH + 3;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BODY);
  doc.text(String(profile.name).slice(0, 34), M, y + 1);
  let detailsY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  [
    profile.city,
    profile.gstin ? `GSTIN: ${profile.gstin}` : null,
    profile.phone ? `Ph: ${profile.phone}` : null
  ].filter(Boolean).forEach((line) => {
    doc.text(String(line).slice(0, 48), M, detailsY);
    detailsY += 4;
  });

  // Right column: invoice title, number and the payable total in a box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('INVOICE', RIGHT, M + 5, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`# ${invoice.id || 'INV-001'}`, RIGHT, M + 10, { align: 'right' });
  doc.setFillColor(241, 245, 249);
  doc.rect(RIGHT - 42, M + 13, 42, 11, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('TOTAL PAYABLE', RIGHT - 40, M + 16.5);
  doc.setFontSize(11);
  doc.setTextColor(...BODY);
  doc.text(pdfMoney(totals.total), RIGHT - 2, M + 22, { align: 'right' });

  y = Math.max(detailsY, M + 26) + 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(M, y, RIGHT, y);
  y += 6;

  // Billed party (left) and the invoice's own dates (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('BILL TO', M, y);
  doc.setFontSize(10);
  doc.setTextColor(...BODY);
  doc.text(String(invoice.party_name || 'Cash Customer').slice(0, 34), M, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  let partyY = y + 8.5;
  if (invoice.customer_phone) {
    doc.text(`+91 ${invoice.customer_phone}`, M, partyY);
    partyY += 4;
  }
  doc.text(`${String(invoice.pricing_tier || 'retail')} price list`, M, partyY);

  const metaX = RIGHT - 52;
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(metaX, y - 3.5, 52, 13, 1.5, 1.5);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Invoice Date', metaX + 2, y);
  doc.setTextColor(...BODY);
  doc.setFont('helvetica', 'bold');
  doc.text(String(invoice.date || '—'), RIGHT - 2, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Payment Mode', metaX + 2, y + 5.5);
  doc.setTextColor(...BODY);
  doc.setFont('helvetica', 'bold');
  doc.text(String(invoice.payment_mode || 'Cash'), RIGHT - 2, y + 5.5, { align: 'right' });

  y = Math.max(partyY, y + 12) + 5;
  y = drawTableHead(y);

  // Line items, breaking to a new page when the rows run out of room
  doc.setFont('helvetica', 'normal');
  items.forEach((item, index) => {
    const name = String(item.name || item.item_name || 'Item');
    const lines = doc.splitTextToSize(name, 66);
    const rowHeight = Math.max(7, lines.length * 3.6 + 3);

    if (y + rowHeight > H - 30) {
      doc.addPage();
      y = M;
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(`Invoice # ${invoice.id || 'INV-001'} (continued)`, M, y);
      y = drawTableHead(y + 4);
      doc.setFont('helvetica', 'normal');
    }

    doc.setFontSize(8.5);
    doc.setTextColor(...BODY);
    doc.text(String(index + 1), M + 2, y + 4.5);
    doc.text(lines, M + 9, y + 4.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(item.quantity || 1), M + 78, y + 4.5, { align: 'right' });
    doc.text(pdfMoney(item.rate ?? item.retail_price ?? 0), M + 102, y + 4.5, { align: 'right' });
    doc.setTextColor(...BODY);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfMoney(lineAmount(item)), RIGHT - 2, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
    doc.setDrawColor(241, 245, 249);
    doc.line(M, y, RIGHT, y);
  });

  // Money block: Sub Total, Discount, GST, Round Off, Total
  if (y + 34 > H - 30) {
    doc.addPage();
    y = M;
  }
  const blockRows = [
    { label: 'Sub Total', value: totals.subtotal },
    totals.discount > 0 ? { label: `Discount (${totals.discountPercent}%)`, value: -totals.discount } : null,
    totals.tax > 0 ? { label: `GST @ ${totals.taxRate}% (included)`, value: totals.tax } : null,
    totals.roundOff !== 0 ? { label: 'Round Off', value: totals.roundOff } : null
  ].filter(Boolean);

  y += 4;
  doc.setFontSize(8.5);
  blockRows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(row.label, M + 60, y);
    doc.setTextColor(...BODY);
    doc.text(pdfSigned(row.value), RIGHT - 2, y, { align: 'right' });
    y += 4.5;
  });

  doc.setFillColor(241, 245, 249);
  doc.rect(M + 55, y - 3.5, RIGHT - M - 55, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('TOTAL', M + 58, y + 2);
  doc.setFontSize(12);
  doc.setTextColor(...BODY);
  doc.text(pdfMoney(totals.total), RIGHT - 2, y + 2.5, { align: 'right' });
  y += 14;

  // Pay by UPI — only when the business has a VPA to collect into
  const upiQrDataUrl = await generateUpiQrCodeDataUrl(profile.upiId, profile.name, totals.total, invoice.id);
  if (upiQrDataUrl) {
    if (y + 34 > H - 24) {
      doc.addPage();
      y = M;
    }
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(M, y, RIGHT - M, 32, 1.5, 1.5);
    doc.addImage(upiQrDataUrl, 'PNG', M + 3, y + 3, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(`SCAN & PAY ${pdfMoney(totals.total)}`, M + 33, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`UPI: ${profile.upiId}`, M + 33, y + 14);
    doc.text('GPay / PhonePe / Paytm / BHIM', M + 33, y + 18.5);
    y += 38;
  } else {
    y += 4;
  }

  // Closing notes
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Notes: Thank you for your business.', M, y);
  y += 4;
  doc.text(doc.splitTextToSize('Terms: Goods once sold are not returnable. Please retain this invoice for your records.', RIGHT - M), M, y);
  y += 8;

  // Footer, signed by the business itself
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, RIGHT, y);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${profile.name} • ${invoice.id || 'INV-001'}`, W / 2, y + 5, { align: 'center' });

  return doc;
}

/**
 * 3. Pre-formatted WhatsApp message & PDF share
 * @param {string} customerPhone - Customer phone number
 * @param {Object} invoice - Invoice data
 * @param {Object} [business] - Business profile (name, logo, upiId)
 */
export async function shareInvoiceOnWhatsApp(customerPhone = '', invoice = {}, business = {}) {
  const profile = { ...DEFAULT_BUSINESS_INFO, ...business };
  const itemsText = invoiceItems(invoice)
    .map(i => `• ${i.name || i.item_name} x ${i.quantity} = ${PDF_CURRENCY}${lineAmount(i).toFixed(0)}`)
    .join('\n');

  const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
  const upiAmount = Number(invoice.amount || 0).toFixed(2);
  const upiPayLink = profile.upiId
    ? `upi://pay?pa=${encodeURIComponent(profile.upiId)}&pn=${encodeURIComponent(profile.name)}&am=${upiAmount}&cu=INR`
    : null;

  const message = [
    `🧾 *INVOICE ${invoice.id || 'INV-001'}*`,
    `*${profile.name}*`,
    '--------------------------------',
    `*Date:* ${invoice.date || new Date().toLocaleDateString('en-IN')}`,
    `*Customer:* ${invoice.party_name || 'Valued Customer'}`,
    `*Pricing Tier:* ${String(invoice.pricing_tier || 'Retail').toUpperCase()}`,
    '--------------------------------',
    itemsText,
    '--------------------------------',
    `*TOTAL PAYABLE: ${PDF_CURRENCY}${Number(invoice.amount || 0).toLocaleString('en-IN')}*`,
    upiPayLink ? `\n📲 *Pay instantly via UPI:*\n${upiPayLink}` : null,
    '\n_Thank you for your business!_'
  ].filter(Boolean).join('\n');

  const encodedUrl = `https://api.whatsapp.com/send?phone=${cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : ''}&text=${encodeURIComponent(message)}`;

  // If running in a modern mobile browser or the Android APK wrapper with Web Share
  if (navigator.share && navigator.canShare) {
    try {
      const doc = await generateInvoicePdf(invoice, profile);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `${invoiceFileName(invoice, profile)}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: invoiceFileName(invoice, profile),
          text: message
        });
        return;
      }
    } catch (e) {
      console.log('Native share failed, falling back to WhatsApp link:', e);
    }
  }

  // Fallback to direct WhatsApp deep link
  window.open(encodedUrl, '_blank');
}
