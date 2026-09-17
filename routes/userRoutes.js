const express = require("express");
const {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getUsers,
  toggleUserActive,
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.put("/me", protect, updateProfile);
router.post("/me/addresses", protect, addAddress);
router.put("/me/addresses/:addressId", protect, updateAddress);
router.delete("/me/addresses/:addressId", protect, deleteAddress);

router.get("/", protect, adminOnly, getUsers);
router.put("/:id/toggle-active", protect, adminOnly, toggleUserActive);

module.exports = router;
