// The business identity that heads every bill. Settings edits are saved per
// device; these are the values a fresh install starts from, so the bill, the
// PDF and the app context all read one definition.
export const DEFAULT_BUSINESS_INFO = {
  name: 'AP Agencies',
  logo: '/ap-agencies-logo.png',
  gstin: '',
  city: '',
  phone: '',
  upiId: '',
  currency: '₹',
  // Bill money block. Both default to 0, so an unconfigured profile bills
  // exactly the cart total: Sub Total = Total, with no discount or tax rows.
  discountPercent: 0,
  taxRate: 0
};
