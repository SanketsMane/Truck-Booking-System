const { test, expect, request } = require("@playwright/test");

// SRS §8.3's mandated end-to-end path, driven through the real UI for the
// parts a shipper/transporter actually experiences (search, book, accept,
// pay, pickup, drop, rate) — mirrors the manual Playwright verification
// done ad-hoc throughout this project's build, now a permanent repo asset.
//
// Backstage setup (admin-verifying KYC, registering a truck's paperwork,
// publishing the trip) is done via direct API calls instead of clicking
// through every form field — backend/tests/integration/happyPath.test.js
// already exercises that business logic exhaustively; what this spec adds
// is proof the real frontend renders and drives the core flow correctly.
//
// Only the shipper's very first login (test 1) actually drives the OTP
// form — that's the one genuine "does the real auth UI work" proof this
// suite needs. Every other actor session (transporter, and the shipper
// again in test 3) reuses an already-authenticated cookie jar instead of
// requesting a fresh OTP, since OTP requests for the same email have a
// real 30s resend cooldown (authConfig.OTP_RESEND_COOLDOWN_SECONDS) that
// repeated UI logins within one short test run would otherwise hit.

const API_URL = process.env.E2E_API_URL || "http://localhost:3000";
const MASTER_OTP = "123456";
const ADMIN_EMAIL = "contactsanket1@gmail.com"; // seeded by backend/scripts/seedAdmin.js

const run = Date.now().toString().slice(-8);
const TRANSPORTER_EMAIL = `e2e-transporter-${run}@example.test`;
const SHIPPER_EMAIL = `e2e-shipper-${run}@example.test`;
// Distinctive, not real cities — this app does exact-string route matching
// (no geocoding, see marketplaceConfig), so any string works, and a unique
// one guarantees this spec's search can't collide with leftover trips from
// manual testing against this same shared dev database.
const FROM_CITY = `E2EOrigin${run}`;
const TO_CITY = `E2EDest${run}`;

test.describe.configure({ mode: "serial" });

let adminApi;
let transporterApi;
let trip;
let shipperId;
let shipperStorageState;

test.beforeAll(async () => {
  adminApi = await request.newContext({ baseURL: API_URL });
  await adminApi.post("/auth/request-otp", { data: { email: ADMIN_EMAIL } });
  await adminApi.post("/auth/verify-otp", { data: { email: ADMIN_EMAIL, otp: MASTER_OTP } });

  // Verification gate off — this spec proves the booking lifecycle UI, not
  // the KYC-review UI, which is a simple list+approve screen already
  // covered by the backend integration suite.
  await adminApi.put("/admin/settings", { data: { verificationGateEnabled: false } });

  transporterApi = await request.newContext({ baseURL: API_URL });
  await transporterApi.post("/auth/request-otp", { data: { email: TRANSPORTER_EMAIL } });
  await transporterApi.post("/auth/verify-otp", {
    data: { email: TRANSPORTER_EMAIL, otp: MASTER_OTP, name: "E2E Transporter", roles: ["transporter"] },
  });

  const truckRes = await transporterApi.post("/trucks", {
    data: { regNumber: `E2E${run}`, truckType: "Open Body", bodyType: "Flatbed", totalCapacity: 20 },
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
  trip = (await tripRes.json()).trip;
});

test.afterAll(async () => {
  await adminApi.dispose();
  await transporterApi.dispose();
});

const signUpViaUi = async (page, { email, name, roleButtonLabel }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send OTP" }).click();
  await page.getByLabel("OTP").waitFor();
  await page.getByLabel("OTP").fill(MASTER_OTP);
  await page.getByRole("button", { name: "Continue" }).click();

  // New user — the backend rejects the first attempt (no name yet) and the
  // form reveals name/role fields for a second attempt.
  await page.getByLabel("Your name").waitFor();
  await page.getByLabel("Your name").fill(name);
  if (roleButtonLabel) {
    await page.getByRole("button", { name: roleButtonLabel }).click();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
};

// Reuses an already-authenticated APIRequestContext's session cookie in a
// fresh browser context, rather than driving another real OTP login — see
// the file-level comment for why.
const openAuthenticatedPage = async (browser, apiContext) => {
  const state = await apiContext.storageState();
  const context = await browser.newContext({ storageState: state });
  return context.newPage();
};

test("shipper signs up, searches, and books capacity through the real UI", async ({ page }) => {
  await signUpViaUi(page, { email: SHIPPER_EMAIL, name: "E2E Shipper", roleButtonLabel: "Ship goods" });

  const meRes = await page.request.get(`${API_URL}/auth/profile`);
  shipperId = (await meRes.json()).user.id;
  shipperStorageState = await page.context().storageState();

  await page.getByLabel("From city").fill(FROM_CITY);
  await page.getByLabel("To city").fill(TO_CITY);
  // The trip departs 2 days out — the search window is only ±1 day
  // (marketplaceConfig.SEARCH_DATE_RANGE_DAYS), so the default "today"
  // date the form starts with would never match it.
  await page.getByLabel("Date").fill(trip.departureAt.slice(0, 10));
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/search\?/);
  const resultCard = page.locator(`a[href^="/trips/"]`).first();
  await expect(resultCard).toBeVisible();
  await resultCard.click();

  await expect(page).toHaveURL(/\/trips\//);
  await page.getByRole("button", { name: "Book this capacity" }).click();

  await page.getByLabel(/Capacity needed/).fill("5");
  await page.getByLabel(/What are you shipping/).fill("Packaged cement bags");
  await page.getByLabel("Pickup point").fill("Warehouse A");
  await page.getByRole("button", { name: "Send booking request" }).click();

  await expect(page).toHaveURL(/\/bookings\//);
  await expect(page.getByText("pending", { exact: false }).first()).toBeVisible();
});

test("transporter accepts the booking through the real UI", async ({ browser }) => {
  const page = await openAuthenticatedPage(browser, transporterApi);

  await page.goto("/bookings");
  const transporterTab = page.getByRole("button", { name: "As Transporter" });
  if (await transporterTab.isVisible()) {
    await transporterTab.click();
  }

  const bookingRow = page.getByText(FROM_CITY).first();
  await expect(bookingRow).toBeVisible();
  await bookingRow.click();

  await page.getByRole("button", { name: "Accept booking" }).click();
  await expect(page.getByText("confirmed", { exact: false }).first()).toBeVisible();
});

test("shipper pays, both parties confirm pickup/drop, and rate each other through the real UI", async ({
  browser,
}) => {
  // Wallet funding is admin backstage, not the UI behavior under test.
  const listRes = await adminApi.get(`${API_URL}/admin/bookings?status=confirmed`);
  const bookings = (await listRes.json()).bookings;
  const booking = bookings.find((b) => b.trip?.fromCity === FROM_CITY);
  expect(booking).toBeTruthy();
  await adminApi.post(`/admin/wallets/${shipperId}/adjust`, {
    data: { amount: booking.priceEstimate, direction: "credit", reason: "e2e funding" },
  });

  const shipperContext = await browser.newContext({ storageState: shipperStorageState });
  const page = await shipperContext.newPage();
  await page.goto(`/bookings/${booking._id}`);

  await page.getByRole("button", { name: "Pay from wallet" }).click();
  await expect(page.getByRole("button", { name: "Confirm pickup" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm pickup" }).click();
  await expect(page.getByText("ongoing", { exact: false }).first()).toBeVisible();

  // Switch to the transporter to confirm drop.
  const transporterPage = await openAuthenticatedPage(browser, transporterApi);
  await transporterPage.goto(`/bookings/${booking._id}`);
  await transporterPage.getByRole("button", { name: "Confirm drop" }).click();
  await expect(transporterPage.getByText("completed", { exact: false }).first()).toBeVisible();

  await transporterPage.getByRole("button", { name: "4 stars" }).click();
  await transporterPage.getByRole("button", { name: "Submit rating" }).click();
  await expect(transporterPage.getByText(/rating has been submitted/i)).toBeVisible();
  await transporterPage.context().close();

  // Back on the shipper's page — reload to see the completed state and rate too.
  await page.reload();
  await expect(page.getByText("completed", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "5 stars" }).click();
  await page.getByRole("button", { name: "Submit rating" }).click();
  await expect(page.getByText(/rating has been submitted/i)).toBeVisible();
  await shipperContext.close();
});
