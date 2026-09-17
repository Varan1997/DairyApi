// Both frontend apps (customer + admin) talk to this one backend,
// so both origins need to be allowed by CORS and Socket.IO.

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  "https://dairy-pp3v9hzj4-dairy7.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

module.exports = allowedOrigins;
