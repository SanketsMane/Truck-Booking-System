const { test, expect, request } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Proves the chat module (backend/tests/integration/chatFlow.test.js covers
// the API contract exhaustively) actually renders and works live through
// the real UI+socket stack: a conversation is hidden until the transporter
// engages, then two concurrently-open browser sessions exchange a text
// message and an image message in real time with no reload, and the
// counterparty's profile can be opened from the chat header.

const API_URL = process.env.E2E_API_URL || "http://localhost:3000";
const MASTER_OTP = "123456";
const ADMIN_EMAIL = "contactsanket1@gmail.com"; // seeded by backend/scripts/seedAdmin.js

const run = Date.now().toString().slice(-8);
const TRANSPORTER_EMAIL = `e2e-chat-transporter-${run}@example.test`;
const SHIPPER_EMAIL = `e2e-chat-shipper-${run}@example.test`;
const FROM_CITY = `E2EChatOrigin${run}`;
const TO_CITY = `E2EChatDest${run}`;

// A minimal, genuinely valid 1x1 PNG — fileController.uploadFile sniffs the
// magic bytes rather than trusting the client-supplied content type, so a
// text stub wouldn't pass.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test.describe.configure({ mode: "serial" });

let adminApi;
let transporterApi;
let shipperApi;
let bookingId;
let imagePath;

test.beforeAll(async () => {
  adminApi = await request.newContext({ baseURL: API_URL });
  await adminApi.post("/auth/request-otp", { data: { email: ADMIN_EMAIL } });
  await adminApi.post("/auth/verify-otp", { data: { email: ADMIN_EMAIL, otp: MASTER_OTP } });
  await adminApi.put("/admin/settings", { data: { verificationGateEnabled: false } });

  transporterApi = await request.newContext({ baseURL: API_URL });
  await transporterApi.post("/auth/request-otp", { data: { email: TRANSPORTER_EMAIL } });
  await transporterApi.post("/auth/verify-otp", {
    data: { email: TRANSPORTER_EMAIL, otp: MASTER_OTP, name: "E2E Chat Transporter", roles: ["transporter"] },
  });

  shipperApi = await request.newContext({ baseURL: API_URL });
  await shipperApi.post("/auth/request-otp", { data: { email: SHIPPER_EMAIL } });
  await shipperApi.post("/auth/verify-otp", {
    data: { email: SHIPPER_EMAIL, otp: MASTER_OTP, name: "E2E Chat Shipper", roles: ["shipper"] },
  });

  const truckRes = await transporterApi.post("/trucks", {
    data: { regNumber: `E2ECHAT${run}`, truckType: "Open Body", bodyType: "Flatbed", totalCapacity: 20 },
  });
  const truckId = (await truckRes.json()).truck._id;

  const departureAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const tripRes = await transporterApi.post("/trips", {
    data: {
      truckId,
      fromCity: FROM_CITY,
      toCity: TO_CITY,
      departureAt,
      pickupPoint: { address: "Warehouse A" },
      dropPoint: { address: "Yard B" },
      totalCapacity: 20,
      availableCapacity: 20,
      pricePerTon: 1000,
    },
  });
  const trip = (await tripRes.json()).trip;

  const bookingRes = await shipperApi.post("/bookings", {
    data: { tripId: trip._id, capacityRequested: 5, goodsDescription: "Cement" },
  });
  bookingId = (await bookingRes.json()).booking._id;

  imagePath = path.join(os.tmpdir(), `e2e-chat-image-${run}.png`);
  fs.writeFileSync(imagePath, Buffer.from(PNG_BASE64, "base64"));
});

test.afterAll(async () => {
  await adminApi.dispose();
  await transporterApi.dispose();
  await shipperApi.dispose();
  fs.rmSync(imagePath, { force: true });
});

// Same cookie-reuse pattern as happyPath.spec.js — avoids real OTP logins
// (and their resend cooldown) for every actor session this spec opens.
const openAuthenticatedPage = async (browser, apiContext) => {
  const state = await apiContext.storageState();
  const context = await browser.newContext({ storageState: state });
  return context.newPage();
};

test("a still-pending, un-messaged booking stays out of the shipper's Chat inbox", async ({ browser }) => {
  const page = await openAuthenticatedPage(browser, shipperApi);
  await page.goto("/chat");
  await expect(page.getByText(/no conversations yet/i)).toBeVisible();
  await page.context().close();
});

test("accepting the booking surfaces the conversation, and chat works live: text, an image, and viewing a profile", async ({
  browser,
}) => {
  await transporterApi.put(`/bookings/${bookingId}/accept`);

  const shipperPage = await openAuthenticatedPage(browser, shipperApi);
  await shipperPage.goto("/chat");
  const conversationLink = shipperPage.getByText(FROM_CITY).first();
  await expect(conversationLink).toBeVisible();
  await conversationLink.click();
  await expect(shipperPage).toHaveURL(/\/chat\/[a-f0-9]{24}/);
  const threadId = shipperPage.url().split("/chat/")[1];

  // Transporter opens the same thread in a second, concurrent session —
  // both pages stay open for the rest of this test so message delivery can
  // be observed live, with no reload on either side.
  const transporterPage = await openAuthenticatedPage(browser, transporterApi);
  await transporterPage.goto(`/chat/${threadId}`);
  await expect(transporterPage.getByText("E2E Chat Shipper")).toBeVisible();

  await shipperPage.getByPlaceholder("Type a message…").fill("Hi, when can you pick up?");
  await shipperPage.getByRole("button", { name: "Send" }).click();
  await expect(transporterPage.getByText("Hi, when can you pick up?")).toBeVisible({ timeout: 5000 });

  await transporterPage.setInputFiles('input[type="file"]', imagePath);
  await expect(transporterPage.getByText("Image ready to send")).toBeVisible();
  await transporterPage.getByRole("button", { name: "Send" }).click();
  await expect(shipperPage.locator("img[alt='']").last()).toBeVisible({ timeout: 5000 });

  // The shipper can open the transporter's profile straight from the chat
  // header — no dedicated public-profile route exists elsewhere, so this
  // is the one place that surface is reachable.
  await shipperPage.getByRole("button", { name: /E2E Chat Transporter/ }).click();
  const dialog = shipperPage.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("E2E Chat Transporter")).toBeVisible();
  await shipperPage.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await shipperPage.context().close();
  await transporterPage.context().close();
});
