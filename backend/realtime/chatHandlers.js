const ChatThread = require("../models/chatThreadModel");

// Message persistence happens over REST (see controllers/chatController.js),
// which then fans the new message out to this room — keeps validation in
// one place while still giving connected clients a live push.
const registerChatHandlers = (io, socket) => {
  socket.on("chat:join", async (threadId) => {
    const thread = await ChatThread.findById(threadId);
    if (!thread || !thread.participants.some((p) => String(p) === socket.auth.id)) {
      return;
    }
    socket.join(`thread:${threadId}`);
  });

  socket.on("chat:leave", (threadId) => {
    socket.leave(`thread:${threadId}`);
  });

  // Room membership (not a DB re-check — this fires on every keystroke) is
  // the authorization boundary here: chat:join above only puts a socket in
  // this room after verifying it belongs to the thread, so a socket that
  // was never a participant was never joined and can't reach this branch.
  socket.on("chat:typing", (threadId) => {
    if (!socket.rooms.has(`thread:${threadId}`)) return;
    socket.to(`thread:${threadId}`).emit("chat:typing", { threadId, userId: socket.auth.id });
  });
};

module.exports = registerChatHandlers;
