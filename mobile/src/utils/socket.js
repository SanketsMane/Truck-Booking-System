import { io } from "socket.io-client";
import { BASE_URL, getStoredTokens } from "../api/client";

// Mirrors backend/realtime/socket.js's authenticateSocket, extended
// specifically for this app (see the driver/vehicle MVP session's backend
// work) to accept `auth.token` alongside the cookie it already checks for
// web — this is the mobile side of that. One connection, reused for both
// live chat (chat:join/chat:message/chat:typing) and the personal
// notification:new stream, same as the web app's single socket.
let socket = null;

export const connectSocket = async () => {
  if (socket?.connected) return socket;
  const { accessToken } = await getStoredTokens();
  if (!accessToken) return null;

  if (socket) socket.disconnect();
  socket = io(BASE_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
