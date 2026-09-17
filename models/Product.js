const mongoose = require("mongoose");

const packSizeSchema = new mongoose.Schema(
  {
    size: { type: String, required: true }, // e.g. "500ml", "1L", "2L"
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. Cow Milk
    description: { type: String, trim: true },
    image: { type: String, default: "" },
    milkType: {
      type: String,
      enum: ["cow", "buffalo", "toned", "full-cream", "ghee", "other"],
      default: "other",
    },
    packSizes: {
      type: [packSizeSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    subscriptionAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
