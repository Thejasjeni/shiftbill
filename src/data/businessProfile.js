// The business identity that heads every bill. Settings edits it; these are the
// values a fresh install starts from, so the bill, the PDF and the app context
// all read one definition.
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

// Only these fields are a profile. A stored copy also carries bookkeeping —
// the local cache's JSON, or the Firestore document's ownership metadata —
// which must never be adopted as a setting or printed on a bill.
const PROFILE_FIELDS = Object.keys(DEFAULT_BUSINESS_INFO);

// The name this app used to write into the profile itself. It was never a real
// choice, so a stored copy carrying it falls back to the current default
// instead of printing the app's name on the shop's bills.
const PLACEHOLDER_BUSINESS_NAME = 'SwiftBill Store';

// Turn anything stored — the local cache or the Firestore document — into a
// complete profile, so no reader has to merge defaults or screen out fields.
export function normalizeProfile(source) {
  const stored = {};
  for (const key of PROFILE_FIELDS) {
    if (source?.[key] !== undefined) stored[key] = source[key];
  }
  if (stored.name === PLACEHOLDER_BUSINESS_NAME) delete stored.name;
  return { ...DEFAULT_BUSINESS_INFO, ...stored };
}

// Did someone actually configure this profile? Every device writes a local copy
// of whatever it is showing, so a copy existing proves nothing — only a value
// that differs from the defaults is worth handing over to the store.
export function isCustomizedProfile(profile) {
  return PROFILE_FIELDS.some((key) => profile[key] !== DEFAULT_BUSINESS_INFO[key]);
}
