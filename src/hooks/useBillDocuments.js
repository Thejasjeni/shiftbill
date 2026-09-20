import { useEffect, useState } from 'react';
import { DEFAULT_BUSINESS_INFO } from '../data/businessProfile';
import {
  generateInvoicePdf,
  generateUpiQrCodeDataUrl,
  invoiceFileName,
  shareInvoiceOnWhatsApp
} from '../utils/posUtilities';

// The documents a bill produces — the UPI code on screen, the one that goes on
// the saved bill, the PDF, the WhatsApp message and the print — plus the page
// title the browser prints and names the file with.
//
// `invoice` is the saved bill this hook draws; while there is none, only the
// live payment preview exists.
export default function useBillDocuments({ businessInfo = {}, invoice, payableTotal }) {
  const [previewQrUrl, setPreviewQrUrl] = useState(null);
  const [receiptQrUrl, setReceiptQrUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const merchantUpiId = businessInfo.upiId || '';
  const merchantName = businessInfo.name || DEFAULT_BUSINESS_INFO.name;

  // The preview QR follows the total (the `cancelled` flag keeps a slow response
  // for an older total from overwriting a newer one)
  useEffect(() => {
    let cancelled = false;
    if (payableTotal > 0 && merchantUpiId) {
      generateUpiQrCodeDataUrl(merchantUpiId, merchantName, payableTotal, 'INV-PREVIEW')
        .then((url) => { if (!cancelled) setPreviewQrUrl(url); });
    } else {
      setPreviewQrUrl(null);
    }
    return () => { cancelled = true; };
  }, [payableTotal, merchantUpiId, merchantName]);

  // The browser writes document.title into its printed page header and into the
  // save-as filename, so the bill borrows the page title while it is on screen
  useEffect(() => {
    if (!invoice) return;
    const previousTitle = document.title;
    document.title = `${merchantName} — ${invoice.id}`;
    return () => { document.title = previousTitle; };
  }, [invoice, merchantName]);

  // The exact-amount QR for the saved bill. Called before the cart is cleared,
  // which is what takes the live preview QR away.
  const captureReceipt = async (saved) => {
    if (!(payableTotal > 0 && merchantUpiId)) {
      setReceiptQrUrl(null);
      return;
    }
    setReceiptQrUrl(await generateUpiQrCodeDataUrl(merchantUpiId, merchantName, payableTotal, saved.id));
  };

  const downloadPdf = async () => {
    if (!invoice) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      const doc = await generateInvoicePdf(invoice, businessInfo);
      doc.save(`${invoiceFileName(invoice, businessInfo)}.pdf`);
    } catch (err) {
      console.error(err);
      setPdfError('Could not make the PDF. Try again, or print the bill instead.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const shareOnWhatsApp = (phone) => {
    if (invoice) shareInvoiceOnWhatsApp(phone, invoice, businessInfo);
  };

  // Thermal print: scope the print to the receipt area (see .print-area)
  const printBill = () => window.print();

  const reset = () => setReceiptQrUrl(null);

  return {
    previewQrUrl,
    receiptQrUrl,
    isGeneratingPdf,
    pdfError,
    captureReceipt,
    downloadPdf,
    shareOnWhatsApp,
    printBill,
    reset
  };
}
