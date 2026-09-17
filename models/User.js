const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    houseNumber: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    label: { type: String, default: "Home" }, // Home, Work, Other
    isDefault: { type: Boolean, default: false },
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number, // meters
    },
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be exactly 10 digits"],
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    addresses: [addressSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
