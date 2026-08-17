// lucide-react dropped brand/social icons a while back (trademark reasons)
// — these mirror Feather Icons' old facebook/instagram/linkedin/youtube
// glyphs (same open icon set lucide forked from), so anywhere the app shows
// a "social profile" icon (site footer, admin branding settings) reads as
// the real platform instead of a generic shape. Shared here rather than
// duplicated per call site.
export const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M15 8.5h2.5V5.5H15A3.5 3.5 0 0 0 11.5 9v2H9v3h2.5v7h3v-7H17l.5-3h-3V9a.5.5 0 0 1 .5-.5Z"
    />
  </svg>
);

export const InstagramIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const LinkedinIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const YoutubeIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33Z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
  </svg>
);

// The one place the four platforms + their branding field name are listed
// together — Footer.jsx and admin/Settings.jsx both map over this instead
// of each keeping their own copy of "which platform goes with which key."
export const SOCIAL_PLATFORMS = [
  { key: "facebookUrl", icon: FacebookIcon, label: "Facebook" },
  { key: "instagramUrl", icon: InstagramIcon, label: "Instagram" },
  { key: "linkedinUrl", icon: LinkedinIcon, label: "LinkedIn" },
  { key: "youtubeUrl", icon: YoutubeIcon, label: "YouTube" },
];
