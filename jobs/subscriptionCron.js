const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { notifyAdminsNewOrder } = require("../utils/socket");
const { startOfDay, sameDay } = require("../utils/date");

// Creates today's Order for every active subscription that hasn't been generated yet today,
// respecting any per-day skip/quantity override the user set for today.
const generateTodaysSubscriptionOrders = async () => {
  const today = startOfDay(new Date());

  const subscriptions = await Subscription.find({
    status: "active",
    startDate: { $lte: today },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: today } }],
  });

  let generated = 0;

  for (const sub of subscriptions) {
    const alreadyProcessed =
      sub.lastGeneratedDate && startOfDay(sub.lastGeneratedDate).getTime() === today.getTime();

    if (alreadyProcessed) continue;

    const override = sub.dateOverrides.find((o) => sameDay(o.date, today));

    if (override?.skipped) {
      sub.lastGeneratedDate = today;
      await sub.save();
      continue;
    }

    const quantity = override?.quantity || sub.quantity;

    const [product, user] = await Promise.all([
      Product.findById(sub.product).select("name"),
      User.findById(sub.user).select("name phone"),
    ]);

    const order = await Order.create({
      user: sub.user,
      items: [
        {
          product: sub.product,
          productName: product ? product.name : "Subscription item",
          packSize: sub.packSize,
          quantity,
          price: sub.price,
        },
      ],
      deliveryAddress: sub.deliveryAddress,
      deliveryDate: today,
      orderType: "subscription",
      subscription: sub._id,
      totalAmount: sub.price * quantity,
      paymentMethod: sub.paymentMethod,
    });

    notifyAdminsNewOrder(order, user ? user.name || user.phone : "Subscriber");

    sub.lastGeneratedDate = today;
    await sub.save();
    generated += 1;
  }

  return { checked: subscriptions.length, generated };
};

// Runs every day at 05:00 server time
const startSubscriptionCron = () => {
  cron.schedule("0 5 * * *", async () => {
    try {
      const { checked, generated } = await generateTodaysSubscriptionOrders();
      console.log(`[cron] Checked ${checked} active subscription(s), generated ${generated} order(s)`);
    } catch (error) {
      console.error("[cron] Failed to generate subscription orders:", error.message);
    }
  });
};

module.exports = { startSubscriptionCron, generateTodaysSubscriptionOrders };
