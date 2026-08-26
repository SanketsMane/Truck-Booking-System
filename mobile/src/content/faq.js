// Verbatim from frontend/src/content/faq.js — questions, answers and
// category groupings match that source exactly. This same array feeds both
// the Help and FAQ screens (mirroring the web app, which renders the
// identical data on two separate routes/pages).
export const FAQ_CATEGORIES = [
  {
    category: "For Shippers",
    items: [
      {
        id: "what-is-truckgee",
        question: "What is TruckGee?",
        answer:
          "TruckGee is a technology platform that connects shippers with transporters who have available space on trucks already travelling compatible routes.",
      },
      {
        id: "how-does-truckgee-work",
        question: "How does TruckGee work?",
        answer:
          "Enter your pickup location, destination, shipment details and preferred date. TruckGee helps you find available trucks already travelling your route. You can review the available options and send a booking request to a transporter.",
      },
      {
        id: "book-entire-truck",
        question: "Do I need to book an entire truck?",
        answer:
          "No. Where suitable capacity is available, you can use only the space your shipment requires instead of booking an entire truck.",
      },
      {
        id: "multiple-transporter-options",
        question: "Will I get multiple transporter options?",
        answer:
          "If multiple transporters have suitable available capacity for your route and date, you may see multiple options and choose the one that suits your requirements.",
      },
      {
        id: "how-is-price-decided",
        question: "How is the price decided?",
        answer:
          "Pricing may depend on the route, shipment weight and volume, vehicle type, available capacity, pickup/drop requirements, timing and the price offered by the transporter.",
      },
      {
        id: "choose-transporter",
        question: "Can I choose the transporter?",
        answer: "Yes. You can review the available options and send a request to the transporter you prefer.",
      },
      {
        id: "truckgee-transport-goods",
        question: "Does TruckGee transport my goods?",
        answer:
          "TruckGee is a technology platform that connects shippers and transporters. The actual transportation is carried out by the transporter selected for the shipment.",
      },
    ],
  },
  {
    category: "For Transporters",
    items: [
      {
        id: "list-available-truck-space",
        question: "How can I list my available truck space?",
        answer: "You can add your route, departure date, vehicle details and available capacity on TruckGee.",
      },
      {
        id: "get-additional-loads",
        question: "How can I get additional loads?",
        answer: "TruckGee helps you discover shipment requests that may match your route and available truck capacity.",
      },
      {
        id: "accept-every-request",
        question: "Do I have to accept every shipment request?",
        answer: "No. You can review the shipment details and decide whether to accept or reject a request.",
      },
      {
        id: "partially-loaded-truck",
        question: "Can I list a partially loaded truck?",
        answer: "Yes. If your truck has suitable unused capacity, you can list the available space for potential shipments.",
      },
      {
        id: "available-space-changes",
        question: "What if my available space changes?",
        answer:
          "Please update or remove your listing as soon as your available capacity changes so that shippers see accurate information.",
      },
    ],
  },
  {
    category: "Loss, Theft, Damage & Insurance",
    items: [
      {
        id: "goods-lost-stolen-damaged",
        question: "What if my goods are lost, stolen or damaged?",
        answer:
          "Before sending your shipment, please discuss and confirm the applicable responsibility, insurance and other terms directly with the transporter. If the agreed terms do not work for you, please do not proceed with the shipment.",
      },
      {
        id: "truckgee-insurance",
        question: "Does TruckGee provide insurance for my goods?",
        answer:
          "Any insurance requirement or coverage should be discussed and confirmed between the shipper and transporter before the shipment is confirmed. Please make sure you are comfortable with the applicable terms before handing over your goods.",
      },
      {
        id: "dispute-with-transporter",
        question: "What if there is a dispute with the transporter?",
        answer:
          "Please first discuss the matter directly with the transporter and refer to the terms agreed for the shipment. Where applicable, TruckGee may assist with communication or provide relevant platform records.",
      },
    ],
  },
  {
    category: "Shipment Information & Documentation",
    items: [
      {
        id: "correct-shipment-details",
        question: "Who is responsible for providing correct shipment details?",
        answer:
          "The shipper should provide accurate information about the shipment, including its weight, quantity, dimensions, description and any other relevant details. Transporters should provide accurate vehicle and route information.",
      },
      {
        id: "any-type-of-goods",
        question: "Can I send any type of goods?",
        answer:
          "No. Shipments must comply with applicable laws and TruckGee's prohibited or restricted-goods policies. Certain goods may require special handling, documentation, permits, packaging, insurance or specialised vehicles.",
      },
      {
        id: "gst-eway-bills",
        question: "What about GST invoices and e-way bills?",
        answer:
          "Shippers and transporters are responsible for complying with applicable tax, invoicing, e-way bill and transportation documentation requirements.",
      },
    ],
  },
  {
    category: "Booking & Cancellation",
    items: [
      {
        id: "transporter-reject-request",
        question: "Can a transporter reject my request?",
        answer:
          "Yes. A transporter can accept or reject a shipment request based on capacity, route, cargo type, timing or other relevant requirements.",
      },
      {
        id: "cancel-my-shipment",
        question: "Can I cancel my shipment?",
        answer: "Cancellation will be subject to the applicable cancellation terms communicated for the shipment.",
      },
      {
        id: "transporter-cancels-after-accepting",
        question: "What if a transporter cancels after accepting my request?",
        answer:
          "The applicable cancellation and reliability policies will apply. Repeated cancellations may affect a transporter's platform reputation or access, where applicable.",
      },
    ],
  },
  {
    category: "Payments",
    items: [
      {
        id: "online-payments",
        question: "Does TruckGee handle online payments?",
        answer: "The initial TruckGee MVP focuses on connecting shippers and transporters. Online payments are not part of the initial MVP.",
      },
    ],
  },
  {
    category: "Trust & Verification",
    items: [
      {
        id: "transporters-verified",
        question: "Are transporters verified?",
        answer:
          "TruckGee may use appropriate identity, business, vehicle and document verification processes to improve trust and reliability. Only verification information actually completed by TruckGee should be represented as verified.",
      },
      {
        id: "ratings-or-history",
        question: "Can I see transporter ratings or history?",
        answer: "Where ratings, reviews or trip history are available, you can use the information provided on the platform to help make your decision.",
      },
    ],
  },
  {
    category: "Why TruckGee?",
    items: [
      {
        id: "how-different-from-traditional",
        question: "How is TruckGee different from traditional truck booking?",
        answer:
          "Traditional truck booking: You generally hire an entire truck for your shipment. TruckGee: You can find a truck that is already travelling your way and, where suitable space is available, use only the capacity your shipment needs.",
      },
      {
        id: "benefit-for-shippers",
        question: "What is the benefit for shippers?",
        answer:
          "You don't have to book the entire truck when you only need part of its available capacity. Find suitable available space and potentially move your goods at a lower cost.",
      },
      {
        id: "benefit-for-transporters",
        question: "What is the benefit for transporters?",
        answer:
          "Don't let suitable empty capacity travel unused. List available space on trips you're already making and get opportunities for additional loads.",
      },
    ],
  },
];

export default FAQ_CATEGORIES;
