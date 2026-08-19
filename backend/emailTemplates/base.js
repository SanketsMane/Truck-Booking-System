// Branded HTML shell every transactional email renders inside — table
// layout + inline styles throughout (not the flexbox/styled-components the
// rest of this app uses), because that's what actually survives real email
// clients (Gmail, Outlook, Apple Mail) rather than getting silently
// stripped or mis-rendered.

const { getBranding } = require("../utils/brandingCache");

// Mirrors frontend/src/theme/theme.js's consumer palette (green accent,
// cool neutrals) so transactional email reads as the same product as the
// app rather than a leftover from an earlier rebrand.
const BRAND_COLOR = "#15803d";
const BRAND_COLOR_STRONG = "#166534";
const BRAND_SOFT = "#f0fdf4";

// Same pattern as emailTemplates/templates.js's own FRONTEND_URL() (not
// imported from there — templates.js already imports FROM this file, so
// the reverse import would be circular).
const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

// frontend/public/email-logo.png — the wordmark, pre-cropped/sized for a
// banner-height header image. Same "admin logo if set, else the bundled
// default" rule frontend/src/components/ui/BrandLogo.jsx uses, so a
// white-labeled deployment's own uploaded logo (admin Settings > Branding)
// shows in email too, not just the app UI.
const DEFAULT_LOGO_URL = () => `${FRONTEND_URL()}/email-logo.png`;
const TEXT_COLOR = "#111318";
const MUTED_COLOR = "#4b5563";
const BORDER_COLOR = "#e5e7eb";
const BG_COLOR = "#f3f4f6";

const SUCCESS_COLOR = "#16a34a";
const SUCCESS_SOFT = "#ecfdf3";
const DANGER_COLOR = "#dc2f3c";
const DANGER_SOFT = "#fef2f2";
const WARNING_COLOR = "#c98a04";
const WARNING_SOFT = "#fffbeb";

// Shared tone lookup for calloutBox/statusPill — one place that maps a
// semantic tone (what happened) to a color (how it reads), same idea as
// the app's own theme.status → color mapping.
const TONES = {
  neutral: { fg: MUTED_COLOR, bg: BG_COLOR, border: BORDER_COLOR },
  success: { fg: SUCCESS_COLOR, bg: SUCCESS_SOFT, border: "rgba(22,163,74,0.25)" },
  danger: { fg: DANGER_COLOR, bg: DANGER_SOFT, border: "rgba(220,47,60,0.22)" },
  warning: { fg: WARNING_COLOR, bg: WARNING_SOFT, border: "rgba(201,138,4,0.25)" },
};

// Every user-supplied value (name, city, admin-entered reason text, etc.)
// must go through this before landing in an email's HTML — these are
// stored strings from account data, not developer-authored content.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));

// A label/value line, e.g. a receipt's "Amount ... ₹5,000" row. Values are
// tabular-nums so a stack of amounts lines up on their digits.
const detailRow = (label, value) => `
  <tr>
    <td style="padding: 9px 0; border-bottom: 1px solid ${BORDER_COLOR}; color: ${MUTED_COLOR}; font-size: 13.5px;">${escapeHtml(label)}</td>
    <td style="padding: 9px 0; border-bottom: 1px solid ${BORDER_COLOR}; text-align: right; font-weight: 600; font-size: 13.5px; color: ${TEXT_COLOR}; font-variant-numeric: tabular-nums;">${value}</td>
  </tr>`;

const detailTable = (rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 18px 0;">${rows.join("")}</table>`;

// A tinted, rounded callout for one important line — a rejection reason, a
// suspension note, a dispute resolution note. One shared look instead of
// every template hand-rolling its own inline-styled box. `html` is
// caller-escaped (these always wrap user/admin-entered text).
const calloutBox = (html, tone = "neutral") => {
  const t = TONES[tone] || TONES.neutral;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 2px 0 16px;">
    <tr>
      <td style="padding: 12px 14px; background-color: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.55;">${html}</td>
    </tr>
  </table>`;
};

// A small colored status word ("Verified", "Suspended") — the email
// equivalent of the app's own StatusBadge, so a status reads the same way
// in an inbox as it does on the dashboard.
const statusPill = (label, tone = "neutral") => {
  const t = TONES[tone] || TONES.neutral;
  return `<span style="display:inline-block; padding:4px 11px; border-radius:999px; background-color:${t.bg}; color:${t.fg}; font-size:12.5px; font-weight:700; letter-spacing:0.02em;">${escapeHtml(label)}</span>`;
};

// The one piece of copy a user needs to *transcribe* rather than just read
// — set apart in a tinted box so it's unmistakable at a glance instead of
// just another line of body text.
const codeBox = (spacedCode) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 4px 0 20px;">
    <tr>
      <td align="center" style="padding: 18px; background-color: ${BRAND_SOFT}; border: 1px solid rgba(21,128,61,0.18); border-radius: 10px; font-size: 30px; font-weight: 700; letter-spacing: 6px; color: ${BRAND_COLOR_STRONG}; font-variant-numeric: tabular-nums;">${escapeHtml(spacedCode)}</td>
    </tr>
  </table>`;

const formatINR = (amount) =>
  `&#8377;${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// The header's logo banner — an admin-configured logo when it's a real
// absolute URL (so it resolves from an inbox with no session/cookie), else
// the bundled default wordmark. Both are the full brand mark (name baked
// into the image), so this is the entire header — no separate "Truckgee"
// text alongside it. alt carries the brand name for clients that block
// remote images until the user opts in.
const brandMark = (branding) => {
  const name = branding.platformName || "Truckgee";
  const logoUrl = branding.logoUrl && /^https?:\/\//i.test(branding.logoUrl) ? branding.logoUrl : DEFAULT_LOGO_URL();
  return `<img src="${escapeHtml(logoUrl)}" height="34" alt="${escapeHtml(name)}" style="display:block; height:34px; width:auto; border:0;" />`;
};

// title/preheader are plain text (never rendered as HTML); bodyHtml is
// pre-built HTML from the caller (already escaped where it embeds
// user data — see the individual templates).
const renderEmail = ({ title, preheader = "", bodyHtml, ctaLabel, ctaUrl }) => {
  const branding = getBranding();
  const brandName = escapeHtml(branding.platformName || "Truckgee");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:14px; border:1px solid ${BORDER_COLOR};">

          <tr>
            <td style="padding: 22px 32px; border-bottom: 1px solid ${BORDER_COLOR};">
              ${brandMark(branding)}
            </td>
          </tr>

          <tr>
            <td style="padding: 32px; color:${TEXT_COLOR}; font-size:15px; line-height:1.65;">
              ${bodyHtml}
              ${
                ctaUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 26px;">
                <tr>
                  <td style="border-radius:10px; background-color:${BRAND_COLOR};">
                    <a href="${ctaUrl}" style="display:inline-block; padding:13px 26px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>

          <tr>
            <td style="padding: 22px 32px; border-top: 1px solid ${BORDER_COLOR}; font-size:12.5px; color:${MUTED_COLOR}; line-height:1.6;">
              <p style="margin:0 0 4px;">${brandName} — Truck capacity sharing marketplace</p>
              <p style="margin:0;">This is an automated message — please don't reply directly to this email.${
                branding.contactEmail
                  ? ` Need help? Reach us through the app's Support page or email <a href="mailto:${escapeHtml(branding.contactEmail)}" style="color:${MUTED_COLOR}; text-decoration:underline;">${escapeHtml(branding.contactEmail)}</a>.`
                  : " Need help? Reach us through the app's Support page."
              }</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
  renderEmail,
  escapeHtml,
  detailRow,
  calloutBox,
  statusPill,
  codeBox,
  detailTable,
  formatINR,
  formatDateTime,
  BRAND_COLOR,
  BRAND_COLOR_STRONG,
  TEXT_COLOR,
  MUTED_COLOR,
  BORDER_COLOR,
  SUCCESS_COLOR,
  DANGER_COLOR,
  WARNING_COLOR,
};
