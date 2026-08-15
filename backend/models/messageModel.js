const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    readBy: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          readAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

messageSchema.index({ thread: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
