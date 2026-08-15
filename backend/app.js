const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const helmet = require("helmet");
const mongoose = require("mongoose");
const sendServerError = require("./utils/sendServerError");

// Must run before any route file below is required — several modules
// (e.g. utils/webPush.js, transitively required via notify.js) read
// process.env at module-load time, not just inside request handlers, so
// this has to happen before those requires, not after.
dotenv.config({
    path:
        process.env.NODE_ENV === "production"
            ? ".env.production"
            : ".env.development",
});

require("./config/validateEnv")();

const csrfOriginCheck = require("./middleWare/csrf");
const { apiLimiter } = require("./middleWare/rateLimit");

// Routes
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const truckRoutes = require("./routes/truckRoutes");
const tripRoutes = require("./routes/tripRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const paymentLogRoutes = require("./routes/paymentLogRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const supportRoutes = require("./routes/supportRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const walletRoutes = require("./routes/walletRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const metaRoutes = require("./routes/metaRoutes");
const pushRoutes = require("./routes/pushRoutes");

const app = express();

// Production runs behind exactly one reverse proxy (nginx — see
// deploy/nginx/sharetruck.conf), which sets X-Forwarded-For. Without this,
// req.ip resolves to the proxy's own address for every request, and every
// rate limiter below ends up keyed on one shared bucket for the whole site
// instead of per client. Trusting exactly one hop (not `true`, which trusts
// the whole chain) means a client still can't spoof this header past the
// proxy. Left unset in dev/test, where there's no proxy in front — trusting
// a hop that doesn't exist would let a client set its own X-Forwarded-For.
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Security headers. CSP is skipped — this is a pure JSON API, not an HTML
// app, so a content policy has nothing meaningful to restrict here; CORP is
// relaxed to cross-origin since CORS (below) already scopes access to the
// one known frontend origin, and the default same-origin CORP would block
// the frontend's own credentialed fetches of /files/:id.
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// Middleware. The verify callback stashes the exact raw request bytes on
// req.rawBody — needed by the Razorpay webhook handler to HMAC the payload
// exactly as sent, since re-serializing req.body would not reproduce the
// same bytes Razorpay signed. Cheap enough to do for every request rather
// than adding a second, route-scoped body parser just for one endpoint.
app.use(
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    })
);
app.use(cookieParser());

// CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);

app.use(csrfOriginCheck);
app.use(apiLimiter);

// Default Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "ShareTruck backend server running successfully",
        environment: process.env.NODE_ENV,
    });
});

// Unauthenticated — a stable, safe-to-poll target for any external uptime
// monitor (UptimeRobot, Better Uptime, etc.). 503 when the DB connection is
// down so a monitor actually distinguishes "server up but broken" from
// "healthy," rather than always reporting 200 as long as the process runs.
app.get("/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? "ok" : "degraded",
        db: dbConnected ? "connected" : "disconnected",
        uptimeSeconds: process.uptime(),
    });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/files", fileRoutes);
app.use("/verification", verificationRoutes);
app.use("/trucks", truckRoutes);
app.use("/trips", tripRoutes);
app.use("/bookings", bookingRoutes);
app.use("/chat", chatRoutes);
app.use("/ratings", ratingRoutes);
app.use("/payment-logs", paymentLogRoutes);
app.use("/notifications", notificationRoutes);
app.use("/support", supportRoutes);
app.use("/disputes", disputeRoutes);
app.use("/admin", adminRoutes);
app.use("/wallet", walletRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/meta", metaRoutes);
app.use("/push", pushRoutes);

// Global error handler — must be the last middleware. Covers errors that
// happen before any controller's own try/catch can run (a malformed JSON
// body throws inside express.json() itself, above), so they get this app's
// normal JSON error shape instead of Express's default HTML error page.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
        return res.status(400).json({ success: false, msg: "Malformed request body" });
    }
    sendServerError(res, err, "unhandledError");
});

// No listen() / connectDB() / startScheduler() here — this module is
// consumed two ways: server.js (real process — see there for those three
// calls) and, directly, by backend/tests/setup.js via supertest, which
// needs a bare importable app with no port bound and no cron jobs started.
module.exports = app;
