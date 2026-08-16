const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const User = require("../models/userModel");
const { setIO } = require("./io");
const registerChatHandlers = require("./chatHandlers");

// Same checks as the HTTP authMiddleware — a banned or logged-out session
// shouldn't be able to open (or keep) a live socket connection either.
const authenticateSocket = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token;
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
