const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Web sends the JWT as an httpOnly cookie; the mobile app has no equivalent
// cookie jar, so it sends the same JWT shape as a bearer header instead
// (issued by authController.issueMobileTokens/mobileRefresh). Bearer is
// checked first — a mobile request has no cookie to fall back to anyway —
// but this is purely additive: an existing cookie-only web request is
// completely unaffected.
const extractToken = (req) => {
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7).trim();
    }
    return req.cookies.token;
};

// Verifies the JWT, then re-checks the account against the database on
// every request rather than trusting the token's embedded claims — a banned
// user's token, a stale role claim from before an addRole call, or a
// logged-out session's token all get rejected here instead of silently
// continuing to work until the token's natural expiry.
const authMiddleware = async (req, res, next) => {

    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({ success: false, msg: "Unauthorized" });
        }

        const decodedToken = jwt.verify( token, process.env.SECRET_KEY );

        const user = await User.findById(decodedToken.id).select("roles isAdmin adminScope status statusReason sessionVersion");
        if (!user) {
            return res.status(401).json({ success: false, msg: "Invalid token" });
        }
        if ((decodedToken.sessionVersion || 0) !== user.sessionVersion) {
            return res.status(401).json({ success: false, msg: "Session expired — please log in again" });
        }
        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                msg: user.status === "banned" ? "This account has been banned" : "This account has been suspended",
            });
        }

        req.auth = {
            id: String(user._id),
            roles: user.roles,
            isAdmin: user.isAdmin,
            adminScope: user.adminScope,
            sessionVersion: user.sessionVersion,
        };
        next();

    } catch (error) {
        res.status(401).json({ success: false, msg: "Invalid token" });
    }
};

// Same verification as authMiddleware (JWT signature, sessionVersion,
// account status) but never rejects an unauthenticated or invalid request —
// it just leaves req.auth undefined and calls next(). Used on routes that
// serve a mix of public and private resources (e.g. GET /files/:id, where a
// public truck photo is servable to a logged-out visitor but a private KYC
// document still needs req.auth to run the owner-or-admin check downstream).
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return next();
        }

        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

        const user = await User.findById(decodedToken.id).select("roles isAdmin adminScope status statusReason sessionVersion");
        if (!user) {
            return next();
        }
        if ((decodedToken.sessionVersion || 0) !== user.sessionVersion) {
            return next();
        }
        if (user.status !== "active") {
            return next();
        }

        req.auth = {
            id: String(user._id),
            roles: user.roles,
            isAdmin: user.isAdmin,
            adminScope: user.adminScope,
            sessionVersion: user.sessionVersion,
        };
        next();

    } catch (error) {
        next();
    }
};

// Role-gated route guard. Admins bypass any role check — SRS-10.6 keeps a
// single admin scope for MVP but leaves room for scoped admin roles later.
const requireRole = (...allowedRoles) => (req, res, next) => {
    if (req.auth?.isAdmin) {
        return next();
    }

    const roles = req.auth?.roles || [];
    const hasRole = allowedRoles.some((role) => roles.includes(role));

    if (!hasRole) {
        return res.status(403).json({ success: false, msg: "Forbidden" });
    }

    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.auth?.isAdmin) {
        return res.status(403).json({ success: false, msg: "Forbidden" });
    }
    next();
};

// Scope-gated route guard (SRS-10.6) — used only on mutating admin actions;
// read-heavy admin views (dashboards, list endpoints) stay on plain
// requireAdmin so any admin scope can see context, and only the write side
// is actually restricted. adminScope "full" is a superuser and bypasses
// every scope check, same as requireRole's isAdmin bypass above.
const requireAdminScope = (...scopes) => (req, res, next) => {
    if (!req.auth?.isAdmin) {
        return res.status(403).json({ success: false, msg: "Forbidden" });
    }
    if (req.auth.adminScope === "full" || scopes.includes(req.auth.adminScope)) {
        return next();
    }
    return res.status(403).json({ success: false, msg: "Forbidden — requires additional admin permissions" });
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAdminScope = requireAdminScope;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;