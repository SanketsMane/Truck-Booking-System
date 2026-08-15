const Trip = require("../models/tripModel");
const { canViewTripLocation } = require("../utils/tripLocationAuth");

// Location pings themselves are persisted over REST (see
// controllers/tripLocationController.js), which then fans the update out
// to this room — mirrors realtime/chatHandlers.js's exact split (validation
// + rate limiting live on the REST side; sockets are join/leave + push only).
const registerLocationHandlers = (io, socket) => {
  socket.on("trip:join", async (tripId) => {
    const trip = await Trip.findById(tripId);
    if (!trip || !(await canViewTripLocation(trip, socket.auth))) {
      return;
    }
    socket.join(`trip:${tripId}`);
  });

  socket.on("trip:leave", (tripId) => {
    socket.leave(`trip:${tripId}`);
  });
};

module.exports = registerLocationHandlers;
