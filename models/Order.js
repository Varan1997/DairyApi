const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    packSize: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }, // price per unit at time of order
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    houseNumber: String,
    street: String,
    landmark: String,
    city: String,
    pincode: String,
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number, // meters
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    deliveryAddress: { type: addressSnapshotSchema, required: true },
    deliveryDate: { type: Date, required: true },

    orderType: { type: String, enum: ["one-time", "subscription"], default: "one-time" },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },

    totalAmount: { type: Number, required: true },

    paymentMethod: { type: String, enum: ["COD", "ONLINE"], required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    razorpay: {
      orderId: String,
      paymentId: String,
      signature: String,
    },

    orderStatus: {
      type: String,
      enum: ["placed", "confirmed", "out_for_delivery", "delivered", "cancelled"],
      default: "placed",
    },

    deliveryPartner: { type: String, default: "Rapido" },
    deliveryNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
