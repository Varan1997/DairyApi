const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { assertPincodeServiceable } = require("../utils/serviceability");

// @desc    Update own profile (name)
// @route   PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  await user.save();

  res.json(user);
});

// @desc    Add a new address
// @route   POST /api/users/me/addresses
const addAddress = asyncHandler(async (req, res) => {
  const { houseNumber, street, landmark, city, pincode, label, isDefault, location } = req.body;

  if (!houseNumber || !street || !city || !pincode) {
    res.status(400);
    throw new Error("houseNumber, street, city and pincode are required");
  }

  await assertPincodeServiceable(pincode);

  const user = await User.findById(req.user._id);

  if (isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }

  user.addresses.push({
    houseNumber,
    street,
    landmark,
    city,
    pincode,
    label,
    location,
    isDefault: isDefault || user.addresses.length === 0,
  });

  await user.save();
  res.status(201).json(user.addresses);
});

// @desc    Update an address
// @route   PUT /api/users/me/addresses/:addressId
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  const { houseNumber, street, landmark, city, pincode, label, isDefault, location } = req.body;

  if (pincode !== undefined && pincode !== address.pincode) {
    await assertPincodeServiceable(pincode);
    address.pincode = pincode;
  }

  if (houseNumber !== undefined) address.houseNumber = houseNumber;
  if (street !== undefined) address.street = street;
  if (landmark !== undefined) address.landmark = landmark;
  if (city !== undefined) address.city = city;
  if (label !== undefined) address.label = label;
  if (location !== undefined) address.location = location;

  if (isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;
  }

  await user.save();
  res.json(user.addresses);
});

// @desc    Delete an address
// @route   DELETE /api/users/me/addresses/:addressId
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  address.deleteOne();

  if (address.isDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  res.json(user.addresses);
});

// ----- Admin -----

// @desc    Get all users
// @route   GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: "user" }).sort({ createdAt: -1 });
  res.json(users);
});

// @desc    Toggle a user's active status
// @route   PUT /api/users/:id/toggle-active
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isActive = !user.isActive;
  await user.save();
  res.json(user);
});

module.exports = {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getUsers,
  toggleUserActive,
};
