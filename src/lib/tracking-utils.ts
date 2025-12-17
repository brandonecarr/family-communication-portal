// Carrier codes for 17track API
export const CARRIER_CODES: Record<string, number> = {
  ups: 100002,
  fedex: 100003,
  usps: 21051,
  dhl: 100001,
  amazon: 100143,
  ontrac: 100049,
  lasership: 100050,
};

// Carrier name to code mapping for UI
export const CARRIER_NAME_TO_CODE: Record<string, number> = {
  "UPS": 100002,
  "FedEx": 100003,
  "USPS": 21051,
  "DHL": 100001,
  "Amazon Logistics": 100143,
  "OnTrac": 100049,
  "LaserShip": 100050,
};

// Detect carrier from tracking number format
export function detectCarrierFromTrackingNumber(trackingNumber: string): string | null {
  if (!trackingNumber) return null;
  
  const num = trackingNumber.toUpperCase().trim();
  
  // UPS: starts with 1Z followed by alphanumeric
  if (/^1Z[A-Z0-9]{16,18}$/i.test(num)) return "UPS";
  
  // FedEx: 12-22 digits, or starts with specific patterns
  if (/^\d{12}$/.test(num) || /^\d{15}$/.test(num) || /^\d{20}$/.test(num) || /^\d{22}$/.test(num)) return "FedEx";
  if (/^[0-9]{12,22}$/.test(num)) return "FedEx";
  
  // USPS: 20-22 digits, or starts with 9 followed by 15-21 digits
  if (/^9[0-9]{15,21}$/.test(num)) return "USPS";
  if (/^[0-9]{20,22}$/.test(num)) return "USPS";
  if (/^(94|93|92|91)[0-9]{18,20}$/.test(num)) return "USPS";
  
  // DHL: 10-11 digits or starts with JD/JJD
  if (/^[0-9]{10,11}$/.test(num)) return "DHL";
  if (/^JD[0-9]{18}$/i.test(num)) return "DHL";
  if (/^JJD[0-9]{17}$/i.test(num)) return "DHL";
  
  // Amazon: TBA followed by digits
  if (/^TBA[0-9]{12,}$/i.test(num)) return "Amazon Logistics";
  
  return null;
}
