const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Order = require("../models/Order");
const Product = require("../models/Product");
const getRazorpayInstance = require("../utils/razorpay");
const { notifyAdminsNewOrder, notifyUserOrderStatus } = require("../utils/socket");
const { assertPincodeServiceable } = require("../utils/serviceability");

const buildOrderItemsAndTotal = async (items) => {
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      const err = new Error(`Product not found or unavailable: ${item.product}`);
      err.statusCode = 400;
      throw err;
    }

    const pack = product.packSizes.id(item.packSizeId);
    if (!pack) {
      const err = new Error(`Pack size not found for product ${product.name}`);
      err.statusCode = 400;
      throw err;
    }

    const quantity = Number(item.quantity) || 1;
    const lineTotal = pack.price * quantity;
    total += lineTotal;

    orderItems.push({
      product: product._id,
      productName: product.name,
      packSize: pack.size,
      quantity,
      price: pack.price,
    });
  }

  return { orderItems, total };
};

// @desc    Create a one-time order (COD or ONLINE)
// @route   POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, deliveryDate, paymentMethod, deliveryNotes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("At least one item is required");
  }
  if (!deliveryAddress || !deliveryAddress.houseNumber || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
    res.status(400);
    throw new Error("A full delivery address is required");
  }
  if (!["COD", "ONLINE"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("paymentMethod must be COD or ONLINE");
  }

  await assertPincodeServiceable(deliveryAddress.pincode);

  const { orderItems, total } = await buildOrderItemsAndTotal(items);

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    deliveryAddress,
    deliveryDate: deliveryDate || new Date(),
    orderType: "one-time",
    totalAmount: total,
    paymentMethod,
    deliveryNotes,
  });

  notifyAdminsNewOrder(order, req.user.name || req.user.phone);

  if (paymentMethod === "ONLINE") {
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      res.status(503);
      throw new Error("Online payment is not configured yet. Please use Cash on Delivery.");
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // paise
      currency: "INR",
      receipt: order._id.toString(),
    });

    order.razorpay.orderId = razorpayOrder.id;
    await order.save();

    return res.status(201).json({
      order,
      razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
    });
  }

  res.status(201).json({ order });
});

// @desc    Verify a Razorpay payment and mark order paid
// @route   POST /api/orders/:id/verify-payment
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this order");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    order.paymentStatus = "failed";
    await order.save();
    res.status(400);
    throw new Error("Payment verification failed");
  }

  order.paymentStatus = "paid";
  order.orderStatus = "confirmed";
  order.razorpay.paymentId = razorpay_payment_id;
  order.razorpay.signature = razorpay_signature;
  await order.save();

  res.json(order);
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get single order (owner or admin)
// @route   GET /api/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.role !== "admin" && order.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this order");
  }

  res.json(order);
});

// @desc    Cancel own order (only while still awaiting admin confirmation)
// @route   PUT /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this order");
  }
  if (order.orderStatus !== "placed") {
    res.status(400);
    throw new Error(`Order cannot be cancelled once it is ${order.orderStatus}`);
  }

  order.orderStatus = "cancelled";
  await order.save();
  res.json(order);
});

// ----- Admin -----

// @desc    Get all orders
// @route   GET /api/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { orderStatus: status } : {};
  const orders = await Order.find(filter).populate("user", "name phone").sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, deliveryNotes } = req.body;
  const validStatuses = ["placed", "confirmed", "out_for_delivery", "delivered", "cancelled"];

  if (!validStatuses.includes(orderStatus)) {
    res.status(400);
    throw new Error("Invalid order status");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.orderStatus = orderStatus;
  if (deliveryNotes !== undefined) order.deliveryNotes = deliveryNotes;
  if (orderStatus === "delivered" && order.paymentMethod === "COD") {
    order.paymentStatus = "paid";
  }

  await order.save();
  notifyUserOrderStatus(order);
  res.json(order);
});

module.exports = {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
