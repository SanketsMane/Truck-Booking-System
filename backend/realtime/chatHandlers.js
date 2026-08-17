const ChatThread = require("../models/chatThreadModel");

// Message persistence happens over REST (see controllers/chatController.js),
// which then fans the new message out to this room — keeps validation in
// one place while still giving connected clients a live push. There is no
// socket-side "send" event here to duplicate-guard: chatController.sendMessage
// (the only path a new message can be created through) already rejects
// sending once the booking backing the thread is cancelled/rejected/expired
// — see MESSAGING_CLOSED_STATUSES there. chat:join intentionally stays a
// pure participant check (not a booking-status check) since joining the
// room is what makes reading history live and marking-as-read work too,
// and those stay open regardless of booking status.
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
