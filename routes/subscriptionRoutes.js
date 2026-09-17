const express = require("express");
const {
  createSubscription,
  getMySubscriptions,
  updateSubscriptionStatus,
  getUpcomingDeliveries,
  setDayOverride,
  getAllSubscriptions,
} = require("../controllers/subscriptionController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, createSubscription);
router.get("/my", protect, getMySubscriptions);
router.put("/:id/status", protect, updateSubscriptionStatus);
router.get("/:id/upcoming", protect, getUpcomingDeliveries);
router.put("/:id/day", protect, setDayOverride);
router.get("/", protect, adminOnly, getAllSubscriptions);

module.exports = router;
