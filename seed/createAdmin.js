// Usage: node seed/createAdmin.js <10-digit-phone> "<Name>"
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const run = async () => {
  const [, , phone, name] = process.argv;

  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    console.error("Usage: node seed/createAdmin.js <10-digit-phone> \"<Name>\"");
    process.exit(1);
  }

  await connectDB();

  let user = await User.findOne({ phone });

  if (user) {
    user.role = "admin";
    if (name) user.name = name;
    await user.save();
    console.log(`Existing user ${phone} promoted to admin.`);
  } else {
    user = await User.create({
      phone,
      name: name || "Admin",
      role: "admin",
      addresses: [],
    });
    console.log(`Admin user created for ${phone}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
