import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

/**
 * 1. Generate Dynamic UPI QR Code Data URL
 * @param {string} upiId - Merchant UPI VPA (e.g. 'thejas@okhdfcbank' or store VPA)
 * @param {string} payeeName - Merchant/Store name
 * @param {number} amount - Exact invoice amount to pre-fill
 * @param {string} invoiceId - Invoice reference number
 * @returns {Promise<string>} Data URL of the generated QR code PNG
 */
export async function generateUpiQrCodeDataUrl(upiId = 'jaggusts@okhdfcbank', payeeName = 'SwiftBill Store', amount = 0, invoiceId = '') {
  const cleanAmount = Number(amount || 0).toFixed(2);
  const note = `Invoice ${invoiceId || 'Payment'}`;
  
  // Standard NPCI UPI URI Specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: {
        dark: '#1E1B4B', // SwiftBill dark indigo theme
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return null;
  }
}

/**
 * 2. Generate PDF Receipt / Invoice using jsPDF with embedded UPI QR Code
 * @param {Object} invoice - Invoice details & item lines
 * @param {Object} [business] - Optional business profile (name, gstin, phone, upiId)
 * @returns {Promise<jsPDF>} jsPDF document instance
 */
export async function generateInvoicePdf(invoice, business = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5' // Optimized for mobile receipts and tablet display
  });

  const currencySymbol = 'Rs. ';
  const merchantUpi = business.upiId || 'jaggusts@okhdfcbank';
  const merchantGstin = business.gstin || '';
  const merchantPhone = business.phone || '';
  const merchantName = business.name || 'SwiftBill Store';
  let y = 14;

  // Header / Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75); // Dark Indigo #1E1B4B
  doc.text(merchantName.toUpperCase().slice(0, 28), 14, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  y += 6;
  doc.text('Powered by SwiftBill • Offline-First Billing', 14, y);
  y += 4;
  const contactLine = [
    merchantGstin ? `GSTIN: ${merchantGstin}` : null,
    merchantPhone ? `Mob: +91 ${merchantPhone}` : null
  ].filter(Boolean).join('  |  ');
  doc.text(contactLine || 'Free & Open Source Billing', 14, y);

  // Divider
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, y, 134, y);

  // Invoice Metadata
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${invoice.id || 'INV-001'}`, 14, y);
  doc.text(`Date: ${invoice.date || new Date().toLocaleDateString('en-IN')}`, 85, y);

  y += 6;
  doc.text(`Customer: ${invoice.party_name || 'Cash Customer'}`, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(13, 148, 136); // Teal accent
  doc.text(`Tier: ${(invoice.pricing_tier || 'Retail').toUpperCase()}`, 85, y);

  // Table Headers
  y += 8;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 120, 7, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ITEM', 17, y + 5);
  doc.text('QTY', 78, y + 5);
  doc.text('RATE', 95, y + 5);
  doc.text('TOTAL', 120, y + 5);

  // Table Items
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const items = invoice.items_json && invoice.items_json.length > 0
    ? invoice.items_json
    : [{ name: 'Store Purchase', quantity: 1, rate: invoice.amount, total: invoice.amount }];

  items.forEach(item => {
    const qty = Number(item.quantity || 1);
    const rate = Number(item.rate ?? item.retail_price ?? 0);
    const total = Number(item.total ?? (qty * rate));
    doc.text(String(item.name || item.item_name || 'Item').slice(0, 24), 17, y);
    doc.text(String(qty), 80, y);
    doc.text(`${currencySymbol}${rate.toFixed(0)}`, 95, y);
    doc.text(`${currencySymbol}${total.toFixed(0)}`, 120, y);
    y += 6;
  });

  // Totals Line — use a single source of truth for the grand total
  const grandTotal = Number(invoice.amount || items.reduce((s, it) => s + Number(it.total ?? (Number(it.quantity || 1) * Number(it.rate ?? it.retail_price ?? 0))), 0)) || 0;
  y += 2;
  doc.line(14, y, 134, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text('GRAND TOTAL:', 70, y);
  doc.setTextColor(5, 150, 105); // Emerald Green
  doc.text(`${currencySymbol}${grandTotal.toLocaleString('en-IN')}`, 112, y);

  // Dynamic UPI QR Code on the receipt (per-business VPA)
  const upiQrDataUrl = await generateUpiQrCodeDataUrl(
    merchantUpi,
    merchantName,
    grandTotal,
    invoice.id
  );

  if (upiQrDataUrl) {
    y += 8;
    doc.addImage(upiQrDataUrl, 'PNG', 14, y, 32, 32);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('SCAN & PAY VIA UPI', 50, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GPay / PhonePe / Paytm / BHIM', 50, y + 16);
    doc.text(`Exact Amount: ${currencySymbol}${grandTotal.toFixed(2)}`, 50, y + 22);
    doc.text('Instant digital confirmation & receipt', 50, y + 28);
    y += 36;
  } else {
    y += 12;
  }

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for shopping with us! Built with SwiftBill FOSS.', 14, y + 4);

  return doc;
}

/**
 * 3. Pre-formatted WhatsApp Message & PDF Share
 * @param {string} customerPhone - Customer phone number
 * @param {Object} invoice - Invoice data
 * @param {Object} [business] - Optional business profile (name, upiId)
 */
export async function shareInvoiceOnWhatsApp(customerPhone = '', invoice = {}, business = {}) {
  const itemsText = (invoice.items_json && invoice.items_json.length > 0)
    ? invoice.items_json.map(i => `• ${i.name || i.item_name} x ${i.quantity} = Rs. ${Number(i.total ?? (Number(i.quantity || 1) * Number(i.rate ?? i.retail_price ?? 0))).toFixed(0)}`).join('\n')
    : `• Sale items: Rs. ${Number(invoice.amount || 0).toFixed(0)}`;

  const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
  const upiAmount = Number(invoice.amount || 0).toFixed(2);
  const upiPayLink = `upi://pay?pa=${encodeURIComponent(business.upiId || 'jaggusts@okhdfcbank')}&pn=${encodeURIComponent(business.name || 'SwiftBill Store')}&am=${upiAmount}&cu=INR`;

  const message = 
`🧾 *TAX INVOICE - SWIFTBILL*
--------------------------------
*Invoice #:* ${invoice.id || 'INV-001'}
*Date:* ${new Date().toLocaleDateString('en-IN')}
*Customer:* ${invoice.party_name || 'Valued Customer'}
*Pricing Tier:* ${(invoice.pricing_tier || 'Retail').toUpperCase()}
--------------------------------
${itemsText}
--------------------------------
*TOTAL PAYABLE: Rs. ${Number(invoice.amount || 0).toLocaleString('en-IN')}*

📲 *Pay Instantly via UPI:*
${upiPayLink}

_Thank you for your business! SwiftBill Open Source POS_`;

  const encodedUrl = `https://api.whatsapp.com/send?phone=${cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : ''}&text=${encodeURIComponent(message)}`;

  // If running in modern mobile browser or Android APK wrapper with Web Share files API
  if (navigator.share && navigator.canShare) {
    try {
      const doc = await generateInvoicePdf(invoice);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `${invoice.id || 'Invoice'}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.id}`,
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
