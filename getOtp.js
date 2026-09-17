require("dotenv").config();
const mongoose = require("mongoose");
const Otp = require("./models/Otp");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const otp = await Otp.findOne({ phone: process.argv[2] }).sort({ createdAt: -1 });
  console.log(otp?.code);
  await mongoose.disconnect();
})();
