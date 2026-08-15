const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./realtime/socket");
const startScheduler = require("./jobs/scheduler");

// Database Connection
connectDB();

// Realtime (chat + live notifications)
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
    },
});
initSocket(io);

startScheduler();

//Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`
        ShareTruck server started successfully
        Environment : ${process.env.NODE_ENV}
        Port        : ${PORT}
`);
});
