const asyncHandler = require("express-async-handler");
const ServiceablePincode = require("../models/ServiceablePincode");
const { checkServiceability } = require("../utils/serviceability");
const { geocodePincode } = require("../utils/geocode");

// @desc    Check if a pincode is serviceable (public)
// @route   GET /api/serviceability/:pincode
const checkPincode = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  if (!/^[0-9]{6}$/.test(pincode)) {
    res.status(400);
    throw new Error("Pincode must be exactly 6 digits");
  }

  const result = await checkServiceability(pincode);
  res.json(result);
});

// ----- Admin -----

// @desc    List all serviceable pincodes
// @route   GET /api/serviceability
const getAllPincodes = asyncHandler(async (req, res) => {
  const pincodes = await ServiceablePincode.find().sort({ createdAt: -1 });
  res.json(pincodes);
});

// @desc    Add a serviceable pincode
// @route   POST /api/serviceability
const addPincode = asyncHandler(async (req, res) => {
  const { pincode, city } = req.body;

  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    res.status(400);
    throw new Error("A valid 6-digit pincode is required");
  }

  const exists = await ServiceablePincode.findOne({ pincode });
  if (exists) {
    res.status(400);
    throw new Error("This pincode is already in the list");
  }

  const record = await ServiceablePincode.create({ pincode, city });

  // Best-effort: don't block adding the pincode if geocoding fails/times out.
  const coords = await geocodePincode(pincode, city);
  if (coords) {
    record.lat = coords.lat;
    record.lng = coords.lng;
    await record.save();
  }

  res.status(201).json(record);
});

// @desc    Update a serviceable pincode (city / active status)
// @route   PUT /api/serviceability/:id
const updatePincode = asyncHandler(async (req, res) => {
  const record = await ServiceablePincode.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Pincode not found");
  }

  const { city, isActive } = req.body;
  if (city !== undefined) record.city = city;
  if (isActive !== undefined) record.isActive = isActive;

  if (record.lat == null || record.lng == null) {
    const coords = await geocodePincode(record.pincode, record.city);
    if (coords) {
      record.lat = coords.lat;
      record.lng = coords.lng;
    }
  }

  await record.save();
  res.json(record);
});

// @desc    Delete a serviceable pincode
// @route   DELETE /api/serviceability/:id
const deletePincode = asyncHandler(async (req, res) => {
  const record = await ServiceablePincode.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Pincode not found");
  }

  await record.deleteOne();
  res.json({ message: "Pincode removed" });
});

module.exports = { checkPincode, getAllPincodes, addPincode, updatePincode, deletePincode };
