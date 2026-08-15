// Branded HTML shell every transactional email renders inside — table
// layout + inline styles throughout (not the flexbox/styled-components the
// rest of this app uses), because that's what actually survives real email
// clients (Gmail, Outlook, Apple Mail) rather than getting silently
// stripped or mis-rendered.

const BRAND_NAME = "ShareTruck";
const BRAND_COLOR = "#ff6a1a";
const TEXT_COLOR = "#14150f";
const MUTED_COLOR = "#63645a";
const BORDER_COLOR = "#e8e8e5";
const BG_COLOR = "#f5f5f3";

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

// A label/value line, e.g. a receipt's "Amount ... ₹5,000" row.
const detailRow = (label, value) => `
  <tr>
    <td style="padding: 9px 0; border-bottom: 1px solid ${BORDER_COLOR}; color: ${MUTED_COLOR}; font-size: 13.5px;">${escapeHtml(label)}</td>
    <td style="padding: 9px 0; border-bottom: 1px solid ${BORDER_COLOR}; text-align: right; font-weight: 600; font-size: 13.5px; color: ${TEXT_COLOR};">${value}</td>
  </tr>`;

const detailTable = (rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 18px 0;">${rows.join("")}</table>`;

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

// title/preheader are plain text (never rendered as HTML); bodyHtml is
// pre-built HTML from the caller (already escaped where it embeds
// user data — see the individual templates).
const renderEmail = ({ title, preheader = "", bodyHtml, ctaLabel, ctaUrl }) => `<!DOCTYPE html>
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
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; border:1px solid ${BORDER_COLOR};">

          <tr>
            <td style="padding: 26px 32px; border-bottom: 1px solid ${BORDER_COLOR};">
              <span style="display:inline-block; width:26px; height:26px; background-color:${BRAND_COLOR}; border-radius:7px; vertical-align:middle;">&nbsp;</span>
              <span style="font-size:19px; font-weight:800; color:${TEXT_COLOR}; vertical-align:middle; margin-left:10px;">${BRAND_NAME}</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px; color:${TEXT_COLOR}; font-size:15px; line-height:1.65;">
              ${bodyHtml}
              ${
                ctaUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 26px;">
                <tr>
                  <td style="border-radius:8px; background-color:${BRAND_COLOR};">
                    <a href="${ctaUrl}" style="display:inline-block; padding:13px 26px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>

          <tr>
            <td style="padding: 22px 32px; border-top: 1px solid ${BORDER_COLOR}; font-size:12.5px; color:${MUTED_COLOR}; line-height:1.6;">
              <p style="margin:0 0 4px;">ShareTruck — Truck capacity sharing marketplace</p>
              <p style="margin:0;">This is an automated message — please don't reply directly to this email. Need help? Reach us through the app's Support page.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

module.exports = {
  renderEmail,
  escapeHtml,
  detailRow,
  detailTable,
  formatINR,
  formatDateTime,
  BRAND_NAME,
  BRAND_COLOR,
  TEXT_COLOR,
  MUTED_COLOR,
  BORDER_COLOR,
};
