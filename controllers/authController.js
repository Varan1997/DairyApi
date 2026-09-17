const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Otp = require("../models/Otp");
const generateToken = require("../utils/generateToken");
const { sendOtpSms } = require("../utils/sms");
const { assertPincodeServiceable } = require("../utils/serviceability");

const PHONE_REGEX = /^[0-9]{10}$/;

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Send OTP to a phone number (used for both register and login)
// @route   POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone || !PHONE_REGEX.test(phone)) {
    res.status(400);
    throw new Error("A valid 10-digit phone number is required");
  }

  const code = generateOtpCode();
  const expiresAt = new Date(
    Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000
  );

  // remove any previous unverified OTPs for this phone, then create a fresh one
  await Otp.deleteMany({ phone, verified: false });
  await Otp.create({ phone, code, expiresAt });

  const result = await sendOtpSms(phone, code);

  if (!result.success) {
    res.status(502);
    throw new Error("Failed to send OTP SMS. Please try again in a moment.");
  }

  res.json({
    message: "OTP sent successfully",
    // Only ever exposed when we fell back to console-log dev mode (no SMS
    // provider configured) — never leaked once a real SMS actually went out.
    devOtp: result.dev ? code : undefined,
  });
});

// @desc    Verify OTP, then register (if new) or log in (if existing)
// @route   POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, name, address } = req.body;

  if (!phone || !otp) {
    res.status(400);
    throw new Error("Phone and OTP are required");
  }

  const otpRecord = await Otp.findOne({ phone, code: otp, verified: false }).sort({
    createdAt: -1,
  });

  if (!otpRecord) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  if (otpRecord.expiresAt < new Date()) {
    res.status(400);
    throw new Error("OTP has expired, please request a new one");
  }

  let user = await User.findOne({ phone });

  if (!user) {
    // New user -> registration. Require name + address the first time.
    // Note: don't mark the OTP verified yet — the client needs to resubmit
    // the same OTP once it collects these details.
    if (!name || !address || !address.houseNumber || !address.street || !address.city || !address.pincode) {
      res.status(400);
      throw new Error("Name and full address are required to register");
    }

    // Don't mark the OTP verified here either — a non-serviceable pincode
    // shouldn't burn the OTP, since the user may retry with a different address.
    await assertPincodeServiceable(address.pincode);

    user = await User.create({
      name,
      phone,
      addresses: [{ ...address, isDefault: true }],
    });
  }

  otpRecord.verified = true;
  await otpRecord.save();

  if (!user.isActive) {
    res.status(403);
    throw new Error("This account has been deactivated");
  }

  const token = generateToken(user._id, user.role);

  res.json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      addresses: user.addresses,
    },
  });
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = { sendOtp, verifyOtp, getMe };
