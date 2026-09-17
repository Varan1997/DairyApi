const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const allowedOrigins = require("./allowedOrigins");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error("Not authorized"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.user.role === "admin") {
      socket.join("admins");
    }
    socket.join(`user:${socket.user._id}`);
  });

  return io;
};

const getIO = () => io;

// Fire-and-forget: notifies connected admins a new order was placed.
const notifyAdminsNewOrder = (order, customerName) => {
  if (!io) return;
  io.to("admins").emit("new_order", {
    orderId: order._id,
    customerName,
    itemsSummary: order.items.map((i) => `${i.productName} (${i.packSize}) x${i.quantity}`).join(", "),
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    orderType: order.orderType,
    createdAt: order.createdAt,
  });
};

// Fire-and-forget: notifies the customer their order status changed.
const notifyUserOrderStatus = (order) => {
  if (!io) return;
  io.to(`user:${order.user}`).emit("order_status_update", {
    orderId: order._id,
    orderStatus: order.orderStatus,
    itemsSummary: order.items.map((i) => `${i.productName} (${i.packSize}) x${i.quantity}`).join(", "),
    totalAmount: order.totalAmount,
    updatedAt: order.updatedAt,
  });
};

module.exports = { initSocket, getIO, notifyAdminsNewOrder, notifyUserOrderStatus };
