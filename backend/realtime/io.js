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

// Forcibly closes any live socket(s) this user currently has open — the
// handshake-time auth check (status/sessionVersion) doesn't re-run on an
// already-established connection, so without this a banned/suspended user's
// open tab keeps receiving chat/notification events until they make a plain
// REST call (which does re-check) or close the tab themselves.
const disconnectUser = (userId) => {
  if (!ioInstance) return;
  ioInstance.in(`user:${userId}`).disconnectSockets(true);
};

module.exports = { setIO, emitToUser, emitToRoom, disconnectUser };
