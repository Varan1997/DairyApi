const mongoose = require("mongoose");

const serviceablePincodeSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{6}$/, "Pincode must be exactly 6 digits"],
    },
    city: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lat: Number,
    lng: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceablePincode", serviceablePincodeSchema);
