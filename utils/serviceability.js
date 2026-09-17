const ServiceablePincode = require("../models/ServiceablePincode");

// Returns { serviceable, city, lat, lng } for a given pincode.
const checkServiceability = async (pincode) => {
  const record = await ServiceablePincode.findOne({ pincode, isActive: true });
  return {
    serviceable: !!record,
    city: record?.city || null,
    lat: record?.lat ?? null,
    lng: record?.lng ?? null,
  };
};

// Throws a 400 error if the pincode isn't serviceable. Use at any point a
// delivery address is accepted (registration, saved addresses, orders, subscriptions).
const assertPincodeServiceable = async (pincode) => {
  const { serviceable } = await checkServiceability(pincode);
  if (!serviceable) {
    const err = new Error(`Sorry, we don't deliver to pincode ${pincode} yet`);
    err.statusCode = 400;
    throw err;
  }
};

module.exports = { checkServiceability, assertPincodeServiceable };
