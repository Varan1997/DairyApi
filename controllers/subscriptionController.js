const asyncHandler = require("express-async-handler");
const Subscription = require("../models/Subscription");
const Product = require("../models/Product");
const { assertPincodeServiceable } = require("../utils/serviceability");
const { startOfDay, sameDay, addDays } = require("../utils/date");

// @desc    Create a daily subscription
// @route   POST /api/subscriptions
const createSubscription = asyncHandler(async (req, res) => {
  const { product, packSizeId, quantity, deliveryAddress, paymentMethod, startDate, endDate } = req.body;

  if (!product || !packSizeId || !deliveryAddress || !paymentMethod || !startDate) {
    res.status(400);
    throw new Error("product, packSizeId, deliveryAddress, paymentMethod and startDate are required");
  }
  if (!deliveryAddress.houseNumber || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
    res.status(400);
    throw new Error("A full delivery address is required");
  }

  await assertPincodeServiceable(deliveryAddress.pincode);

  const productDoc = await Product.findById(product);
  if (!productDoc || !productDoc.isActive) {
    res.status(400);
    throw new Error("Product not found or unavailable");
  }
  if (!productDoc.subscriptionAvailable) {
    res.status(400);
    throw new Error("This product is not available for subscription");
  }

  const pack = productDoc.packSizes.id(packSizeId);
  if (!pack) {
    res.status(400);
    throw new Error("Pack size not found");
  }

  const subscription = await Subscription.create({
    user: req.user._id,
    product: productDoc._id,
    packSize: pack.size,
    quantity: Number(quantity) || 1,
    price: pack.price,
    deliveryAddress,
    paymentMethod,
    startDate,
    endDate: endDate || undefined,
  });

  res.status(201).json(subscription);
});

// @desc    Get logged-in user's subscriptions
// @route   GET /api/subscriptions/my
const getMySubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ user: req.user._id })
    .populate("product", "name image milkType")
    .sort({ createdAt: -1 });
  res.json(subscriptions);
});

// @desc    Pause / resume / cancel own subscription
// @route   PUT /api/subscriptions/:id/status
const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["active", "paused", "cancelled"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }
  if (subscription.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this subscription");
  }

  subscription.status = status;
  await subscription.save();
  res.json(subscription);
});

// @desc    Preview upcoming deliveries for a subscription (default plan + any overrides)
// @route   GET /api/subscriptions/:id/upcoming?days=7
const getUpcomingDeliveries = asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  const subscription = await Subscription.findById(req.params.id);

  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }
  if (req.user.role !== "admin" && subscription.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this subscription");
  }

  const today = startOfDay(new Date());
  const start = subscription.startDate > today ? startOfDay(subscription.startDate) : today;
  const end = subscription.endDate ? startOfDay(subscription.endDate) : null;

  const upcoming = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    if (end && date > end) break;

    const override = subscription.dateOverrides.find((o) => sameDay(o.date, date));
    upcoming.push({
      date,
      skipped: override?.skipped || false,
      quantity: override?.quantity || subscription.quantity,
      isOverridden: !!override,
    });
  }

  res.json(upcoming);
});

// @desc    Skip a single delivery day, or override its quantity
// @route   PUT /api/subscriptions/:id/day
const setDayOverride = asyncHandler(async (req, res) => {
  const { date, skipped, quantity } = req.body;

  if (!date) {
    res.status(400);
    throw new Error("date is required");
  }

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) {
    res.status(404);
    throw new Error("Subscription not found");
  }
  if (subscription.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this subscription");
  }

  const targetDate = startOfDay(date);
  if (targetDate < startOfDay(new Date())) {
    res.status(400);
    throw new Error("Cannot modify a past delivery date");
  }

  const existingIndex = subscription.dateOverrides.findIndex((o) => sameDay(o.date, targetDate));
  const isBackToDefault = !skipped && (!quantity || Number(quantity) === subscription.quantity);

  if (isBackToDefault) {
    if (existingIndex !== -1) subscription.dateOverrides.splice(existingIndex, 1);
  } else {
    const overrideEntry = {
      date: targetDate,
      skipped: !!skipped,
      quantity: skipped ? undefined : Number(quantity) || subscription.quantity,
    };
    if (existingIndex !== -1) {
      subscription.dateOverrides[existingIndex] = overrideEntry;
    } else {
      subscription.dateOverrides.push(overrideEntry);
    }
  }

  await subscription.save();
  res.json(subscription);
});

// ----- Admin -----

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
const getAllSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find()
    .populate("user", "name phone")
    .populate("product", "name")
    .sort({ createdAt: -1 });
  res.json(subscriptions);
});

module.exports = {
  createSubscription,
  getMySubscriptions,
  updateSubscriptionStatus,
  getUpcomingDeliveries,
  setDayOverride,
  getAllSubscriptions,
};
