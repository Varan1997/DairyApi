const express = require("express");
const {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/my", protect, getMyOrders);
router.get("/", protect, adminOnly, getAllOrders);
router.get("/:id", protect, getOrderById);
router.post("/:id/verify-payment", protect, verifyPayment);
router.put("/:id/cancel", protect, cancelOrder);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
