// The full set of transactional emails this app sends. Each function
// returns {subject, html} — callers pass that straight to
// utils/emailProvider.js's sendEmail({to, subject, html}). Every value that
// comes from user/account data is escaped via base.js's escapeHtml before
// it's interpolated; only developer-authored copy is trusted as raw HTML.
const { renderEmail, escapeHtml, detailRow, detailTable, formatINR, formatDateTime } = require("./base");

const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

// 1. Welcome — sent once, right after a new account finishes signup.
const welcomeEmail = ({ name }) => {
  const safeName = escapeHtml(name || "there");
  return {
    subject: "Welcome to ShareTruck",
    html: renderEmail({
      title: "Welcome to ShareTruck",
      preheader: "Your account is ready — find or fill spare truck capacity in minutes.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Welcome to ShareTruck — your account is ready. Whether you're shipping a partial load or have spare capacity on a truck already running a route, you're all set to get started.</p>
        <p style="margin:0;">If you ever need help, reach us through the app's Support page.</p>
      `,
      ctaLabel: "Open ShareTruck",
      ctaUrl: FRONTEND_URL(),
    }),
  };
};

// 2. Password reset — replaces the old inline <p> string in authController.js.
const passwordResetEmail = ({ name, resetUrl, expiryMinutes }) => {
  const safeName = escapeHtml(name || "there");
  return {
    subject: "Reset your ShareTruck password",
    html: renderEmail({
      title: "Reset your password",
      preheader: `This link expires in ${expiryMinutes} minutes.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">We received a request to reset your ShareTruck password. Click the button below to choose a new one — this link expires in ${expiryMinutes} minutes.</p>
        <p style="margin:0;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      `,
      ctaLabel: "Reset your password",
      ctaUrl: resetUrl,
    }),
  };
};

// 3. Booking confirmed — sent to the shipper once the transporter accepts.
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
        <p style="margin:0;">Complete payment from the app to lock in pickup.</p>
      `,
      ctaLabel: "View booking",
      ctaUrl: `${FRONTEND_URL()}/bookings/${bookingId}`,
    }),
  };
};

// 4. Payment receipt — sent to the shipper once a booking payment settles
// (wallet or Razorpay, both call sites — see bookingPaymentController.js
// and utils/paymentFinalizer.js).
const paymentReceiptEmail = ({ name, fromCity, toCity, amount, paymentMethod, paidAt, bookingId }) => {
  const safeName = escapeHtml(name || "there");
  const methodLabel = paymentMethod === "razorpay" ? "Razorpay" : "Wallet";
  return {
    subject: `Payment receipt — ${formatINR(amount).replace("&#8377;", "₹")}`,
    html: renderEmail({
      title: "Payment receipt",
      preheader: `Payment received for ${fromCity} to ${toCity}.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 12px;">This confirms your payment for the booking below.</p>
        ${detailTable([
          detailRow("Route", `${escapeHtml(fromCity)} &rarr; ${escapeHtml(toCity)}`),
          detailRow("Amount paid", formatINR(amount)),
          detailRow("Payment method", methodLabel),
          detailRow("Paid on", formatDateTime(paidAt)),
        ])}
        <p style="margin:0;">Keep this email for your records.</p>
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
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        ${
          isVerified
            ? `<p style="margin:0;">Your ${escapeHtml(roleLabel)} verification has been approved. You now have full access to ${
                type === "transporter" ? "post trips and accept bookings" : "book capacity"
              } on ShareTruck.</p>`
            : `<p style="margin:0 0 16px;">Your ${escapeHtml(roleLabel)} verification wasn't approved this time${
                reason ? `: <strong>${escapeHtml(reason)}</strong>` : "."
              }</p><p style="margin:0;">You can update your documents and resubmit from your profile at any time.</p>`
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
  const statusCopy = {
    active: "reactivated",
    suspended: "suspended",
    banned: "banned",
  }[status] || status;
  return {
    subject: `Your ShareTruck account has been ${statusCopy}`,
    html: renderEmail({
      title: "Account status update",
      preheader: `Your account is now ${statusCopy}.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Your ShareTruck account has been <strong>${escapeHtml(statusCopy)}</strong>${
          reason ? `: ${escapeHtml(reason)}` : "."
        }</p>
        ${
          status === "active"
            ? `<p style="margin:0;">You can log in and use ShareTruck as normal.</p>`
            : `<p style="margin:0;">If you believe this is a mistake, reach our team through the app's Support page.</p>`
        }
      `,
    }),
  };
};

// 7. Withdrawal paid — sent to the transporter once an admin records the
// payout reference (see adminWalletController.markWithdrawalPaid).
const withdrawalPaidEmail = ({ name, amount, payoutReference }) => {
  const safeName = escapeHtml(name || "there");
  return {
    subject: `Your withdrawal of ${formatINR(amount).replace("&#8377;", "₹")} has been paid`,
    html: renderEmail({
      title: "Withdrawal paid",
      preheader: "Your payout has been sent.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 12px;">Your withdrawal has been paid out.</p>
        ${detailTable([
          detailRow("Amount", formatINR(amount)),
          detailRow("Reference", escapeHtml(payoutReference || "—")),
        ])}
        <p style="margin:0;">It may take a day or two to reflect in your bank/UPI account, depending on your provider.</p>
      `,
      ctaLabel: "View wallet",
      ctaUrl: `${FRONTEND_URL()}/wallet`,
    }),
  };
};

// 8. Dispute resolved — sent to both the raiser and the counterparty once
// an admin resolves or rejects a dispute (see disputeController.resolveDispute).
const disputeResolvedEmail = ({ name, category, status, resolutionNote }) => {
  const safeName = escapeHtml(name || "there");
  const CATEGORY_LABELS = {
    no_show: "No-show",
    damaged_goods: "Damaged goods",
    payment_issue: "Payment issue",
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
        ${resolutionNote ? `<p style="margin:0 0 16px; padding:12px 14px; background-color:#f5f5f3; border-radius:8px;">${escapeHtml(resolutionNote)}</p>` : ""}
        <p style="margin:0;">If you have further questions, reach us through the app's Support page.</p>
      `,
      ctaLabel: "View disputes",
      ctaUrl: `${FRONTEND_URL()}/disputes`,
    }),
  };
};

module.exports = {
  welcomeEmail,
  passwordResetEmail,
  bookingConfirmedEmail,
  paymentReceiptEmail,
  verificationStatusEmail,
  accountStatusEmail,
  withdrawalPaidEmail,
  disputeResolvedEmail,
};
