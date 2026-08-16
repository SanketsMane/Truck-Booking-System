import { io } from "socket.io-client";
import { BASE_URL } from "./client";

let socket = null;

// One connection per session, opened after login and torn down on logout —
// see AuthContext. withCredentials sends the same httpOnly JWT cookie the
// REST API uses; the server verifies it in realtime/socket.js.
export const connectSocket = () => {
  if (socket?.connected) return socket;
  socket = io(BASE_URL, { withCredentials: true });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

export const joinThread = (threadId) => socket?.emit("chat:join", threadId);
export const leaveThread = (threadId) => socket?.emit("chat:leave", threadId);
export const notifyTyping = (threadId) => socket?.emit("chat:typing", threadId);
