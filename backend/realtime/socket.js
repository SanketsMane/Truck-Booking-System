const jwt = require("jsonwebtoken");
const { parseCookie } = require("cookie");

const User = require("../models/userModel");
const { setIO } = require("./io");
const registerChatHandlers = require("./chatHandlers");

// Same checks as the HTTP authMiddleware — a banned or logged-out session
// shouldn't be able to open (or keep) a live socket connection either.
// Mobile has no cookie jar to ride on, so socket.io-client's standard
// `{ auth: { token } }` connect-time option is checked first — the same
// bearer access token the mobile app sends on REST calls (authMiddleware.
// extractToken's counterpart for the socket handshake).
const authenticateSocket = async (socket, next) => {
  try {
    const bearerToken = socket.handshake.auth?.token;
    const cookies = parseCookie(socket.handshake.headers.cookie || "");
    const token = bearerToken || cookies.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const user = await User.findById(decoded.id).select("roles isAdmin status sessionVersion");
    if (!user || user.status !== "active" || (decoded.sessionVersion || 0) !== user.sessionVersion) {
      return next(new Error("Unauthorized"));
    }

    socket.auth = { id: String(user._id), roles: user.roles, isAdmin: user.isAdmin };
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
};

const initSocket = (io) => {
  setIO(io);
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.auth.id}`);
    registerChatHandlers(io, socket);
  });
};

module.exports = initSocket;
