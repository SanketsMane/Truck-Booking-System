// Real answers, drawn from how the product actually behaves — not
// marketing copy. Each item's `id` is a stable anchor other pages can
// deep-link to (e.g. Home's FAQ teaser links to `/help#cancellations`), and
// this same array feeds both the visible accordion on Help.jsx and its
// FAQPage JSON-LD, so the two can't drift out of sync with each other.
// Kept in its own module (not exported from Help.jsx) so Fast Refresh
// still treats Help.jsx as a component-only file.
export const FAQ_CATEGORIES = [
  {
    category: "Getting started",
    items: [
      {
        id: "how-to-book",
        question: "How do I book truck capacity?",
        answer:
          "Search your route and date from the home page, compare the available trips by price and capacity, and send a booking request. Once the transporter accepts, pay through the app to confirm pickup — you can track the shipment live from there.",
      },
      {
        id: "kyc-verification",
        question: "How does identity verification (KYC) work?",
        answer:
          "Before you can accept or confirm a booking, you'll submit a document — Aadhaar, PAN, a driving licence, or a business/GST certificate — from your profile. Our team reviews it, and you're notified once it's approved.",
      },
      {
        id: "shipper-and-transporter",
        question: "Can I be both a shipper and a transporter?",
        answer:
          "Yes. Add the second role from your Profile page at any time — no separate account needed.",
      },
    ],
  },
  {
    category: "Payments",
    items: [
      {
        id: "how-payment-works",
        question: "How do I pay for a booking?",
        answer:
          "From your wallet balance, or with a card/UPI through our payment gateway. Either way, the payment is held until the delivery is confirmed — it isn't released to the transporter until then.",
      },
      {
        id: "payment-window",
        question: "What happens if I don't pay in time?",
        answer:
          "A confirmed booking has to be paid within 12 hours of the transporter accepting it. If it isn't, the booking is cancelled automatically so the capacity doesn't sit reserved indefinitely.",
      },
      {
        id: "commission",
        question: "Does the platform take a cut?",
        answer:
          "Yes, a transparent commission is deducted automatically once a delivery is confirmed — the rest goes straight to the transporter's wallet. The rate is shown on every trip before you book.",
      },
      {
        id: "withdrawals",
        question: "As a transporter, how do I get paid out?",
        answer:
          "Delivery earnings land in your in-app wallet as soon as a booking is confirmed delivered. From there, request a withdrawal to your bank account or UPI ID whenever you like.",
      },
    ],
  },
  {
    category: "Cancellations",
    items: [
      {
        id: "cancellations",
        question: "Can I cancel a confirmed booking?",
        answer:
          "Yes, free of charge, up until 6 hours before the trip's departure time. After that cutoff, cancellations aren't permitted through the app.",
      },
      {
        id: "no-response",
        question: "What if a transporter never responds to my request?",
        answer:
          "A booking request that isn't accepted or rejected within its response window expires automatically, so you're never left waiting indefinitely — you're free to book a different trip.",
      },
    ],
  },
  {
    category: "Trust & safety",
    items: [
      {
        id: "disputes",
        question: "What if something goes wrong with a delivery?",
        answer:
          "You can raise a dispute directly from that booking's detail page. Our team reviews it and resolves it — this is separate from a general Support request, and is the fastest way to flag a specific booking problem.",
      },
      {
        id: "ratings",
        question: "How does rating work?",
        answer:
          "After a booking is completed, both sides can rate and review each other. Ratings are visible on profiles, so a track record builds up on both the shipper and transporter side over time.",
      },
      {
        id: "data-shared",
        question: "What information does the other party see about me?",
        answer:
          "Once you have an active booking together, they can see your name, city, and rating — enough to coordinate a pickup — plus any chat messages you exchange. Your mobile number and verification documents are never shown to other users.",
      },
    ],
  },
  {
    category: "For transporters",
    items: [
      {
        id: "post-a-trip",
        question: "How do I list spare capacity?",
        answer:
          "Register your truck and complete verification, then post a trip with your route, departure date, and the capacity (and volume, if relevant) you have spare. It's searchable the moment it's published.",
      },
      {
        id: "weight-and-volume",
        question: "What if my truck's limit is space, not weight?",
        answer:
          "You can list both a weight capacity and a volume capacity (in cubic metres) on a trip — useful for bulky-but-light loads that would hit a volume limit before a weight one.",
      },
    ],
  },
];

export default FAQ_CATEGORIES;
