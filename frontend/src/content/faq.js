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
          "Search your route and date from the home page, compare the available trips by price and capacity, and send a booking request. Once the transporter accepts, coordinate pickup directly with them — you can follow the booking's status (confirmed, picked up, delivered) from there.",
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
      {
        id: "platform-role",
        question: "Does the platform transport my goods itself?",
        answer:
          "No. It's a technology platform that connects shippers and transporters — the actual transportation is carried out by the transporter you book, not by us.",
      },
      {
        id: "multiple-options",
        question: "Will I see multiple transporter options?",
        answer:
          "If more than one transporter has suitable available capacity for your route and date, you'll see all of them and can compare before choosing.",
      },
      {
        id: "how-different",
        question: "How is this different from booking a truck the traditional way?",
        answer:
          "Traditionally you hire an entire truck for your shipment. Here, you find a truck that's already travelling your way and, where suitable space is available, use only the capacity your shipment actually needs.",
      },
    ],
  },
  {
    category: "Pricing & payment",
    items: [
      {
        id: "how-pricing-works",
        question: "How does payment work?",
        answer:
          "The platform doesn't process any payment — you and the other party agree directly on price, method (cash, UPI, bank transfer, whatever works for you), and timing. The price shown on a trip is a reference estimate the transporter sets, so you can compare options before you book.",
      },
      {
        id: "price-factors",
        question: "What determines the price?",
        answer:
          "The route, your shipment's weight and volume, vehicle type, available capacity, pickup/drop requirements and timing all factor in — along with the price the transporter has set for that trip.",
      },
      {
        id: "commission",
        question: "Does the platform take a cut?",
        answer:
          "No. It's completely free to use — no commission, no platform fee, no hidden charges, for shippers or transporters.",
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
      {
        id: "transporter-reject",
        question: "Can a transporter reject my booking request?",
        answer:
          "Yes — a transporter can decline based on capacity, route, cargo type, timing or other requirements. If they decline, you're free to book a different trip right away.",
      },
      {
        id: "transporter-cancels",
        question: "What if a transporter cancels after accepting my request?",
        answer:
          "It happens rarely, but you're not left stuck — you can book another trip immediately. Repeated cancellations show up in that transporter's rating, so it affects their reputation on the platform.",
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
        id: "loss-damage",
        question: "What if my goods are lost, stolen or damaged in transit?",
        answer:
          "Agree on responsibility and insurance directly with the transporter before you hand over your shipment — the platform itself doesn't provide cargo insurance or cover loss/damage. If you're not comfortable with the terms a transporter offers, don't proceed with that booking.",
      },
      {
        id: "ratings",
        question: "How does rating work?",
        answer:
          "After a booking is completed, both sides can rate and review each other. Ratings are visible on profiles, so a track record builds up on both the shipper and transporter side over time.",
      },
      {
        id: "verified-meaning",
        question: "What does a 'verified' badge actually mean?",
        answer:
          "It means that account's KYC documents (Aadhaar, PAN, driving licence, or business certificate) were reviewed and approved by our team — it reflects document verification, not a guarantee of every future shipment.",
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
    category: "Shipments & documentation",
    items: [
      {
        id: "shipment-accuracy",
        question: "Who's responsible for accurate shipment details?",
        answer:
          "The shipper is responsible for giving accurate weight, quantity, dimensions and a clear description of the goods. The transporter is responsible for accurate vehicle and route information.",
      },
      {
        id: "restricted-goods",
        question: "Can I ship anything?",
        answer:
          "No — shipments must comply with applicable law and can't include prohibited or restricted goods. Some goods need special handling, packaging, permits or insurance, so check with your transporter before booking if you're unsure.",
      },
      {
        id: "gst-eway",
        question: "What about GST invoices and e-way bills?",
        answer:
          "Shippers and transporters are each responsible for their own tax, invoicing, e-way bill and transportation documentation — the platform doesn't generate these for you.",
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
          "Register your truck and complete verification, then post a trip with your route, departure date, and the capacity you have spare. It's searchable the moment it's published.",
      },
      {
        id: "no-obligation",
        question: "Do I have to accept every shipment request I get?",
        answer:
          "No. Review each request's details and accept or decline based on your own capacity, route and cargo fit.",
      },
      {
        id: "keep-listing-updated",
        question: "What if my available space changes after I post a trip?",
        answer:
          "Update or remove your listing as soon as your available capacity changes, so shippers only ever see accurate, bookable space.",
      },
    ],
  },
];

export default FAQ_CATEGORIES;
