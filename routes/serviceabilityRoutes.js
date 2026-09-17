const express = require("express");
const {
  checkPincode,
  getAllPincodes,
  addPincode,
  updatePincode,
  deletePincode,
} = require("../controllers/serviceabilityController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, adminOnly, getAllPincodes);
router.post("/", protect, adminOnly, addPincode);
router.put("/:id", protect, adminOnly, updatePincode);
router.delete("/:id", protect, adminOnly, deletePincode);
router.get("/:pincode", checkPincode);

module.exports = router;
