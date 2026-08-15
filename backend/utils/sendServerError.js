// Every controller's catch-all was returning `error.message` straight to
// the client — which for things like a missing file on disk includes the
// absolute server filesystem path, and for a bad ObjectId includes raw
// Mongoose internals. Logs the real error server-side, sends a generic one.
const sendServerError = (res, error, context) => {
  console.error(`[${context}]`, error);

  // A malformed ObjectId in a route/query param (e.g. a truncated or
  // hand-edited URL) throws a Mongoose CastError before any real controller
  // logic runs — that's a bad request, not a server fault. Centralizing
  // this here covers every controller's `:id`/`req.query` params without
  // needing per-route validation everywhere they're used.
  if (error.name === "CastError" && error.kind === "ObjectId") {
    return res.status(400).json({ success: false, msg: "Invalid ID format" });
  }

  res.status(500).json({ success: false, msg: "Something went wrong. Please try again." });
};

module.exports = sendServerError;
