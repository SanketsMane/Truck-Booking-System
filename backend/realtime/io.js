// Thin singleton holder so any controller can emit without importing
// server.js (which would create a require cycle).

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

const emitToRoom = (room, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(room).emit(event, payload);
};

module.exports = { setIO, emitToUser, emitToRoom };
