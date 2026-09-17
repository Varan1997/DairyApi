const mongoose = require("mongoose");

const addressSnapshotSchema = new mongoose.Schema(
  {
    houseNumber: String,
    street: String,
    landmark: String,
    city: String,
    pincode: String,
  },
  { _id: false }
);

// A per-date override on top of the default daily plan — lets a user skip a
// single delivery or change its quantity without touching the subscription itself.
const dateOverrideSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // normalized to start-of-day
    skipped: { type: Boolean, default: false },
    quantity: { type: Number, min: 1 }, // only meaningful when not skipped; falls back to subscription.quantity
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    packSize: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }, // price per unit locked in at subscription time

    frequency: { type: String, enum: ["daily"], default: "daily" },
    deliveryAddress: { type: addressSnapshotSchema, required: true },
    paymentMethod: { type: String, enum: ["COD", "ONLINE"], required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date }, // optional; null = until cancelled
    lastGeneratedDate: { type: Date }, // last date an Order was auto-created for
    dateOverrides: { type: [dateOverrideSchema], default: [] },

    status: { type: String, enum: ["active", "paused", "cancelled"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
