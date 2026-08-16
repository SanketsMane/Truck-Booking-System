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

    // Not required — a message can be image-only. sendMessageValidation
    // enforces that at least one of text/image is present before this ever
    // reaches the model.
    text: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      url: { type: String },
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
