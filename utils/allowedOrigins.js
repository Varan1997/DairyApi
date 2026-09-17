// Both frontend apps (customer + admin) talk to this one backend, so both
// their origins need to be allowed by CORS and the Socket.IO handshake.
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  process.env.ADMIN_URL || "http://localhost:5174",
].filter(Boolean);

module.exports = allowedOrigins;
