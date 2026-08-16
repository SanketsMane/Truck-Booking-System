const mongoose = require("mongoose");
const app = require("../../app");
const ChatThread = require("../../models/chatThreadModel");
const { signupUser, disableVerificationGate, postTestTrip } = require("../helpers");

const emailFor = (seed) => `chatuser${seed}@example.test`;

const newActors = async (seed) => {
  const { agent: transporterAgent, user: transporter } = await signupUser(app, {
    email: emailFor(seed * 10 + 1),
    name: "T",
    roles: ["transporter"],
  });
  const { agent: shipperAgent, user: shipper } = await signupUser(app, {
    email: emailFor(seed * 10 + 2),
    name: "S",
    roles: ["shipper"],
  });
  return { transporterAgent, transporter, shipperAgent, shipper };
};

// Runs a booking all the way through create -> accept. In practice the
// ChatThread is actually created inside bookingController.createBooking
// (line 105) the moment the request is made, but going through accept too
// gives us a "real", fully-confirmed booking to chat about.
const createAndAcceptBooking = async (transporterAgent, shipperAgent, overrides = {}) => {
  const trip = await postTestTrip(transporterAgent, overrides);
  const bookingRes = await shipperAgent
    .post("/bookings")
    .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
  if (!bookingRes.body.success) {
    throw new Error(`createAndAcceptBooking: create failed: ${bookingRes.body.msg}`);
  }
  const bookingId = bookingRes.body.booking._id;

  const acceptRes = await transporterAgent.put(`/bookings/${bookingId}/accept`);
  if (!acceptRes.body.success) {
    throw new Error(`createAndAcceptBooking: accept failed: ${acceptRes.body.msg}`);
  }

  return { trip, bookingId };
};

beforeEach(async () => {
  await disableVerificationGate();
});

describe("chat flow", () => {
  it("full happy path: thread lookup, empty list, sending both ways, ordering, and marking read", async () => {
    const { transporterAgent, shipperAgent, transporter, shipper } = await newActors(1);
    const { bookingId } = await createAndAcceptBooking(transporterAgent, shipperAgent);

    // Thread exists (created back at request time, still there after
    // acceptance) and both participants can look it up via the booking id.
    const shipperThreadRes = await shipperAgent.get(`/chat/booking/${bookingId}`);
    expect(shipperThreadRes.status).toBe(200);
    expect(shipperThreadRes.body.success).toBe(true);
    expect(shipperThreadRes.body.thread).toBeTruthy();
    expect(String(shipperThreadRes.body.thread.booking)).toBe(String(bookingId));
    const participantIds = shipperThreadRes.body.thread.participants.map(String);
    expect(participantIds).toEqual(expect.arrayContaining([String(shipper._id), String(transporter._id)]));

    const transporterThreadRes = await transporterAgent.get(`/chat/booking/${bookingId}`);
    expect(transporterThreadRes.status).toBe(200);
    const threadId = transporterThreadRes.body.thread._id;
    expect(String(threadId)).toBe(String(shipperThreadRes.body.thread._id));

    // No messages yet.
    const emptyListRes = await shipperAgent.get(`/chat/${threadId}/messages`);
    expect(emptyListRes.status).toBe(200);
    expect(emptyListRes.body.success).toBe(true);
    expect(emptyListRes.body.messages).toEqual([]);

    // Shipper sends first.
    const shipperMsgRes = await shipperAgent.post(`/chat/${threadId}/messages`).send({ text: "Hi, when can you pick up?" });
    expect(shipperMsgRes.status).toBe(201);
    expect(shipperMsgRes.body.success).toBe(true);
    expect(shipperMsgRes.body.message).toBeTruthy();
    expect(shipperMsgRes.body.message.text).toBe("Hi, when can you pick up?");
    expect(String(shipperMsgRes.body.message.sender)).toBe(String(shipper._id));
    expect(String(shipperMsgRes.body.message.thread)).toBe(String(threadId));

    // Transporter replies.
    const transporterMsgRes = await transporterAgent
      .post(`/chat/${threadId}/messages`)
      .send({ text: "Tomorrow morning, 9am." });
    expect(transporterMsgRes.status).toBe(201);
    expect(transporterMsgRes.body.message.text).toBe("Tomorrow morning, 9am.");
    expect(String(transporterMsgRes.body.message.sender)).toBe(String(transporter._id));

    // Both messages show up, in send order, for either participant.
    const listRes = await transporterAgent.get(`/chat/${threadId}/messages`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.messages).toHaveLength(2);
    expect(listRes.body.messages[0].text).toBe("Hi, when can you pick up?");
    expect(listRes.body.messages[1].text).toBe("Tomorrow morning, 9am.");

    // Thread's lastMessageAt should have advanced.
    const threadAfterMsgs = await ChatThread.findById(threadId);
    expect(threadAfterMsgs.lastMessageAt).toBeTruthy();

    // Transporter marks the thread read (marks the shipper's message as read by them).
    const readRes = await transporterAgent.put(`/chat/${threadId}/read`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.success).toBe(true);

    const listAfterRead = await shipperAgent.get(`/chat/${threadId}/messages`);
    const shipperMessage = listAfterRead.body.messages.find((m) => m.text === "Hi, when can you pick up?");
    const readEntries = shipperMessage.readBy.map((r) => String(r.user));
    expect(readEntries).toContain(String(transporter._id));
  });

  it("returns 404 (not 403) for a user who is not a participant, on every thread-scoped route", async () => {
    const { transporterAgent, shipperAgent } = await newActors(2);
    const { bookingId } = await createAndAcceptBooking(transporterAgent, shipperAgent);

    const threadRes = await shipperAgent.get(`/chat/booking/${bookingId}`);
    const threadId = threadRes.body.thread._id;

    const { agent: strangerAgent } = await signupUser(app, {
      email: emailFor(23),
      name: "Stranger",
      roles: ["shipper"],
    });

    const strangerBookingLookup = await strangerAgent.get(`/chat/booking/${bookingId}`);
    expect(strangerBookingLookup.status).toBe(404);
    expect(strangerBookingLookup.body.success).toBe(false);

    const strangerList = await strangerAgent.get(`/chat/${threadId}/messages`);
    expect(strangerList.status).toBe(404);
    expect(strangerList.body.success).toBe(false);

    const strangerSend = await strangerAgent.post(`/chat/${threadId}/messages`).send({ text: "hi" });
    expect(strangerSend.status).toBe(404);
    expect(strangerSend.body.success).toBe(false);

    const strangerRead = await strangerAgent.put(`/chat/${threadId}/read`);
    expect(strangerRead.status).toBe(404);
    expect(strangerRead.body.success).toBe(false);
  });

  // NOTE: bookingController.createBooking (backend/controllers/bookingController.js:105)
  // calls `ChatThread.create(...)` immediately when the booking REQUEST is
  // made, not inside acceptBooking. So — contrary to the "no thread until
  // accepted" assumption — a still-pending booking already has a reachable
  // thread. This test documents that actual behavior; see the final report
  // for why this looks like a genuine discrepancy worth a second look.
  it("a still-pending (never accepted) booking already has a reachable thread, since it's created at request time", async () => {
    const { transporterAgent, shipperAgent } = await newActors(3);
    const trip = await postTestTrip(transporterAgent);
    const bookingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const bookingId = bookingRes.body.booking._id;

    const shipperLookup = await shipperAgent.get(`/chat/booking/${bookingId}`);
    expect(shipperLookup.status).toBe(200);
    expect(shipperLookup.body.success).toBe(true);
    expect(String(shipperLookup.body.thread.booking)).toBe(String(bookingId));

    const transporterLookup = await transporterAgent.get(`/chat/booking/${bookingId}`);
    expect(transporterLookup.status).toBe(200);
    expect(transporterLookup.body.success).toBe(true);
  });

  it("returns 404 for a bookingId with no matching thread at all", async () => {
    const { shipperAgent } = await newActors(30);
    const bogusBookingId = new mongoose.Types.ObjectId().toString();

    const res = await shipperAgent.get(`/chat/booking/${bogusBookingId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("rejects sending a message with an invalid/empty body with 400", async () => {
    const { transporterAgent, shipperAgent } = await newActors(4);
    const { bookingId } = await createAndAcceptBooking(transporterAgent, shipperAgent);
    const threadRes = await shipperAgent.get(`/chat/booking/${bookingId}`);
    const threadId = threadRes.body.thread._id;

    const missingText = await shipperAgent.post(`/chat/${threadId}/messages`).send({});
    expect(missingText.status).toBe(400);
    expect(missingText.body.success).toBe(false);
    expect(typeof missingText.body.msg).toBe("string");

    const emptyText = await shipperAgent.post(`/chat/${threadId}/messages`).send({ text: "" });
    expect(emptyText.status).toBe(400);
    expect(emptyText.body.success).toBe(false);

    const whitespaceOnly = await shipperAgent.post(`/chat/${threadId}/messages`).send({ text: "   " });
    expect(whitespaceOnly.status).toBe(400);
    expect(whitespaceOnly.body.success).toBe(false);

    const tooLong = await shipperAgent.post(`/chat/${threadId}/messages`).send({ text: "a".repeat(2001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.success).toBe(false);

    // Sanity: no message ever got created for this thread from the invalid attempts.
    const listRes = await shipperAgent.get(`/chat/${threadId}/messages`);
    expect(listRes.body.messages).toEqual([]);
  });

  it("accepts an image-only message and rejects a malformed imageUrl", async () => {
    const { transporterAgent, shipperAgent } = await newActors(5);
    const { bookingId } = await createAndAcceptBooking(transporterAgent, shipperAgent);
    const threadRes = await shipperAgent.get(`/chat/booking/${bookingId}`);
    const threadId = threadRes.body.thread._id;

    const bogus = await shipperAgent.post(`/chat/${threadId}/messages`).send({ imageUrl: "not-a-file-ref" });
    expect(bogus.status).toBe(400);

    const fileId = new mongoose.Types.ObjectId().toString();
    const imageOnly = await shipperAgent.post(`/chat/${threadId}/messages`).send({ imageUrl: `/files/${fileId}` });
    expect(imageOnly.status).toBe(201);
    expect(imageOnly.body.message.image.url).toBe(`/files/${fileId}`);
    expect(imageOnly.body.message.text).toBe("");

    // The real chat UI always sends a `text` key, even when empty (the
    // composer's text field just wasn't filled in) — this must not be
    // rejected as if text were the only thing missing, as long as an image
    // is attached.
    const imageWithEmptyText = await shipperAgent
      .post(`/chat/${threadId}/messages`)
      .send({ text: "", imageUrl: `/files/${fileId}` });
    expect(imageWithEmptyText.status).toBe(201);
    expect(imageWithEmptyText.body.message.image.url).toBe(`/files/${fileId}`);

    const both = await transporterAgent
      .post(`/chat/${threadId}/messages`)
      .send({ text: "see attached", imageUrl: `/files/${fileId}` });
    expect(both.status).toBe(201);
    expect(both.body.message.text).toBe("see attached");
    expect(both.body.message.image.url).toBe(`/files/${fileId}`);
  });

  it("GET /chat/:threadId returns a populated summary for a participant, 404 for a stranger", async () => {
    const { transporterAgent, transporter, shipperAgent } = await newActors(6);
    const { bookingId } = await createAndAcceptBooking(transporterAgent, shipperAgent, {
      fromCity: "Mumbai",
      toCity: "Pune",
    });
    const threadRes = await shipperAgent.get(`/chat/booking/${bookingId}`);
    const threadId = threadRes.body.thread._id;

    const getRes = await shipperAgent.get(`/chat/${threadId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.thread.counterparty.name).toBe(transporter.name);
    expect(getRes.body.thread.counterparty).not.toHaveProperty("mobile");
    expect(getRes.body.thread.booking.trip.fromCity).toBe("Mumbai");
    expect(getRes.body.thread.booking.status).toBe("confirmed");

    const { agent: strangerAgent } = await signupUser(app, { email: emailFor(60), name: "Stranger", roles: ["shipper"] });
    const strangerRes = await strangerAgent.get(`/chat/${threadId}`);
    expect(strangerRes.status).toBe(404);
  });

  it("inbox: a still-pending, un-messaged thread is hidden; sending a message or accepting the booking surfaces it", async () => {
    const { transporterAgent, shipperAgent } = await newActors(7);
    const trip = await postTestTrip(transporterAgent);
    const pendingRes = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" });
    const pendingBookingId = pendingRes.body.booking._id;

    // Not yet in either side's inbox — no message, still pending.
    const shipperInboxBefore = await shipperAgent.get("/chat/inbox");
    expect(shipperInboxBefore.status).toBe(200);
    expect(shipperInboxBefore.body.threads).toEqual([]);
    const transporterInboxBefore = await transporterAgent.get("/chat/inbox");
    expect(transporterInboxBefore.body.threads).toEqual([]);

    // Transporter accepting the request is enough to surface it, with no message sent.
    await transporterAgent.put(`/bookings/${pendingBookingId}/accept`);
    const shipperInboxAfterAccept = await shipperAgent.get("/chat/inbox");
    expect(shipperInboxAfterAccept.body.threads).toHaveLength(1);
    expect(shipperInboxAfterAccept.body.threads[0].booking._id).toBe(pendingBookingId);
    expect(shipperInboxAfterAccept.body.threads[0].unreadCount).toBe(0);

    // A second, still-pending booking (never accepted) stays hidden until a message is sent.
    const trip2 = await postTestTrip(transporterAgent, { fromCity: "Nagpur", toCity: "Indore" });
    const pendingRes2 = await shipperAgent
      .post("/bookings")
      .send({ tripId: trip2._id, capacityRequested: 3, goodsDescription: "Steel rods" });
    const pendingBookingId2 = pendingRes2.body.booking._id;
    const threadRes2 = await shipperAgent.get(`/chat/booking/${pendingBookingId2}`);
    const threadId2 = threadRes2.body.thread._id;

    expect((await shipperAgent.get("/chat/inbox")).body.threads).toHaveLength(1);

    await shipperAgent.post(`/chat/${threadId2}/messages`).send({ text: "still interested?" });
    const shipperInboxAfterMsg = await shipperAgent.get("/chat/inbox");
    expect(shipperInboxAfterMsg.body.threads).toHaveLength(2);
    expect(shipperInboxAfterMsg.body.threads.map((t) => t.booking._id)).toContain(pendingBookingId2);

    // Transporter's inbox now shows the message as unread, and it clears after marking read.
    const transporterInbox = await transporterAgent.get("/chat/inbox");
    const entry = transporterInbox.body.threads.find((t) => t.booking._id === pendingBookingId2);
    expect(entry.unreadCount).toBe(1);
    await transporterAgent.put(`/chat/${threadId2}/read`);
    const transporterInboxAfterRead = await transporterAgent.get("/chat/inbox");
    expect(transporterInboxAfterRead.body.threads.find((t) => t.booking._id === pendingBookingId2).unreadCount).toBe(0);

    // Most-recently-active conversation sorts first.
    expect(shipperInboxAfterMsg.body.threads[0].booking._id).toBe(pendingBookingId2);
  });
});
