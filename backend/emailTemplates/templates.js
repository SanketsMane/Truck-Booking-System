// The full set of transactional emails this app sends. Each function
// returns {subject, html} — callers pass that straight to
// utils/emailProvider.js's sendEmail({to, subject, html}). Every value that
// comes from user/account data is escaped via base.js's escapeHtml before
// it's interpolated; only developer-authored copy is trusted as raw HTML.
const { renderEmail, escapeHtml, detailRow, detailTable, calloutBox, statusPill, codeBox, formatINR, formatDateTime } = require("./base");
const { getBrandName } = require("../utils/brandingCache");

const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

// 1. OTP — sent on every signup/login OTP request (backend/utils/otpProvider.js).
// The code itself is set in large, spaced-out digits since it's the one
// template a user needs to *transcribe* rather than just read.
const otpEmail = ({ otp, expiryMinutes }) => {
  const spacedOtp = String(otp).split("").join(" ");
  const brand = getBrandName();
  return {
    subject: `${spacedOtp.replace(/ /g, "")} is your ${brand} verification code`,
    html: renderEmail({
      title: "Your verification code",
      preheader: `Your code is ${otp} — it expires in ${expiryMinutes} minutes.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi there,</p>
        <p style="margin:0 0 16px;">Use this code to continue signing in to ${escapeHtml(brand)}. It expires in ${expiryMinutes} minutes.</p>
        ${codeBox(spacedOtp)}
        <p style="margin:0;">If you didn't request this code, you can safely ignore this email.</p>
      `,
    }),
  };
};

// 2. Welcome — sent once, right after a new account finishes signup.
const welcomeEmail = ({ name }) => {
  const safeName = escapeHtml(name || "there");
  const brand = getBrandName();
  return {
    subject: `Welcome to ${brand}`,
    html: renderEmail({
      title: `Welcome to ${brand}`,
      preheader: "Your account is ready — find or fill spare truck capacity in minutes.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Welcome to ${escapeHtml(brand)} — your account is ready. Whether you're shipping a partial load or have spare capacity on a truck already running a route, you're all set to get started.</p>
        <p style="margin:0;">If you ever need help, reach us through the app's Support page.</p>
      `,
      ctaLabel: `Open ${brand}`,
      ctaUrl: FRONTEND_URL(),
    }),
  };
};

// 3. Password reset — replaces the old inline <p> string in authController.js.
const passwordResetEmail = ({ name, resetUrl, expiryMinutes }) => {
  const safeName = escapeHtml(name || "there");
  const brand = getBrandName();
  return {
    subject: `Reset your ${brand} password`,
    html: renderEmail({
      title: "Reset your password",
      preheader: `This link expires in ${expiryMinutes} minutes.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">We received a request to reset your ${escapeHtml(brand)} password. Click the button below to choose a new one — this link expires in ${expiryMinutes} minutes.</p>
        <p style="margin:0;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      `,
      ctaLabel: "Reset your password",
      ctaUrl: resetUrl,
    }),
  };
};

// 4. Booking confirmed — sent to the shipper once the transporter accepts.
const bookingConfirmedEmail = ({ name, fromCity, toCity, departureAt, capacityRequested, priceEstimate, bookingId }) => {
  const safeName = escapeHtml(name || "there");
  return {
    subject: `Booking confirmed: ${escapeHtml(fromCity)} → ${escapeHtml(toCity)}`,
    html: renderEmail({
      title: "Booking confirmed",
      preheader: `${fromCity} to ${toCity} — ${capacityRequested} tons confirmed.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 12px;">Good news — your booking request has been accepted.</p>
        ${detailTable([
          detailRow("Route", `${escapeHtml(fromCity)} &rarr; ${escapeHtml(toCity)}`),
          detailRow("Departure", formatDateTime(departureAt)),
          detailRow("Capacity", `${escapeHtml(capacityRequested)} tons`),
          detailRow("Estimated price", formatINR(priceEstimate)),
        ])}
        <p style="margin:0;">The transporter has accepted — coordinate pickup directly with them from the app.</p>
      `,
      ctaLabel: "View booking",
      ctaUrl: `${FRONTEND_URL()}/bookings/${bookingId}`,
    }),
  };
};

// 5. KYC verification status changed (verified/rejected).
const verificationStatusEmail = ({ name, type, status, reason }) => {
  const safeName = escapeHtml(name || "there");
  const roleLabel = type === "transporter" ? "transporter" : "shipper";
  const isVerified = status === "verified";
  return {
    subject: isVerified ? `Your ${roleLabel} verification is approved` : `Your ${roleLabel} verification needs attention`,
    html: renderEmail({
      title: "Verification update",
      preheader: isVerified ? "You're verified — you can now transact freely." : "Your submission needs a resubmission.",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">${statusPill(isVerified ? "Verified" : "Needs resubmission", isVerified ? "success" : "warning")}</p>
        ${
          isVerified
            ? `<p style="margin:0;">Your ${escapeHtml(roleLabel)} verification has been approved. You now have full access to ${
                type === "transporter" ? "post trips and accept bookings" : "book capacity"
              } on ${escapeHtml(getBrandName())}.</p>`
            : `<p style="margin:0 0 12px;">Your ${escapeHtml(roleLabel)} verification wasn't approved this time.</p>
               ${reason ? calloutBox(escapeHtml(reason), "warning") : ""}
               <p style="margin:0;">You can update your documents and resubmit from your profile at any time.</p>`
        }
      `,
      ctaLabel: "Go to profile",
      ctaUrl: `${FRONTEND_URL()}/profile`,
    }),
  };
};

// 6. Account status changed (suspended/banned/reactivated) — may be the
// only channel a suspended/banned user can still receive, since they can
// no longer log in to see an in-app notification.
const accountStatusEmail = ({ name, status, reason }) => {
  const safeName = escapeHtml(name || "there");
  const brand = getBrandName();
  const statusCopy = {
    active: "reactivated",
    suspended: "suspended",
    banned: "banned",
  }[status] || status;
  const tone = status === "active" ? "success" : "danger";
  return {
    subject: `Your ${brand} account has been ${statusCopy}`,
    html: renderEmail({
      title: "Account status update",
      preheader: `Your account is now ${statusCopy}.`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Your ${escapeHtml(brand)} account is now ${statusPill(
          statusCopy.charAt(0).toUpperCase() + statusCopy.slice(1),
          tone
        )}</p>
        ${reason ? calloutBox(escapeHtml(reason), tone) : ""}
        ${
          status === "active"
            ? `<p style="margin:0;">You can log in and use ${escapeHtml(brand)} as normal.</p>`
            : `<p style="margin:0;">If you believe this is a mistake, reach our team through the app's Support page.</p>`
        }
      `,
    }),
  };
};

// 7. Dispute resolved — sent to both the raiser and the counterparty once
// an admin resolves or rejects a dispute (see disputeController.resolveDispute).
const disputeResolvedEmail = ({ name, category, status, resolutionNote }) => {
  const safeName = escapeHtml(name || "there");
  const CATEGORY_LABELS = {
    no_show: "No-show",
    damaged_goods: "Damaged goods",
    behavior: "Behavior",
    other: "Other",
  };
  const outcome = status === "resolved" ? "resolved" : "reviewed and closed";
  return {
    subject: `Update on your dispute (${CATEGORY_LABELS[category] || "dispute"})`,
    html: renderEmail({
      title: "Dispute update",
      preheader: `Your dispute has been ${outcome}.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Your ${escapeHtml(CATEGORY_LABELS[category] || "dispute")} report has been ${escapeHtml(outcome)}.</p>
        ${resolutionNote ? calloutBox(escapeHtml(resolutionNote), status === "resolved" ? "success" : "neutral") : ""}
        <p style="margin:0;">If you have further questions, reach us through the app's Support page.</p>
      `,
      ctaLabel: "View disputes",
      ctaUrl: `${FRONTEND_URL()}/disputes`,
    }),
  };
};

module.exports = {
  otpEmail,
  welcomeEmail,
  passwordResetEmail,
  bookingConfirmedEmail,
  verificationStatusEmail,
  accountStatusEmail,
  disputeResolvedEmail,
};
