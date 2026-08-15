// Cookie auth uses `sameSite: "none"` (required for the cross-origin
// frontend/backend split), which on its own does nothing to stop a
// cross-site request from carrying the session cookie. This closes that
// gap: any state-changing request whose Origin doesn't match the known
// frontend is rejected. A real cross-site forgery attempt always has an
// Origin header (browsers set it unconditionally on cross-origin requests,
// including "simple" requests like multipart form uploads that skip the
// CORS preflight); requests with no Origin header at all are left alone
// rather than risk breaking legitimate non-browser API use.
const csrfOriginCheck = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && origin !== process.env.FRONTEND_URL) {
    return res.status(403).json({ success: false, msg: "Forbidden" });
  }

  next();
};

module.exports = csrfOriginCheck;
