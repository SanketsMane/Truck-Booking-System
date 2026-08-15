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

  socket.on("chat:typing", (threadId) => {
    socket.to(`thread:${threadId}`).emit("chat:typing", { threadId, userId: socket.auth.id });
  });
};

module.exports = registerChatHandlers;
