const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },

    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
    },

    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const ChatThread = mongoose.model("ChatThread", chatThreadSchema);

module.exports = ChatThread;
