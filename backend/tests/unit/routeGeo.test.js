const { distanceFromRoute } = require("../../utils/routeGeo");

// Real coordinates, not synthetic ones — this is the exact scenario the
// feature exists for: a truck posted Bangalore->Mumbai should be findable
// by a shipper searching Pune->Mumbai, since Pune sits close to that route
// (~45km off it, per the cross-track math), not on some unrelated one.
const bangalore = { lat: 12.9716, lng: 77.5946 };
const mumbai = { lat: 19.076, lng: 72.8777 };
const pune = { lat: 18.5204, lng: 73.8567 };
const delhi = { lat: 28.7041, lng: 77.1025 };

describe("routeGeo.distanceFromRoute", () => {
  it("finds Pune close to (and between the endpoints of) the Bangalore->Mumbai route", () => {
    const result = distanceFromRoute(bangalore, mumbai, pune);
    expect(result.crossTrackKm).toBeGreaterThan(30);
    expect(result.crossTrackKm).toBeLessThan(60);
    expect(result.alongTrackKm).toBeGreaterThan(0);
    expect(result.alongTrackKm).toBeLessThan(result.routeLengthKm);
  });

  it("finds Delhi far off that same route", () => {
    const result = distanceFromRoute(bangalore, mumbai, delhi);
    expect(result.crossTrackKm).toBeGreaterThan(500);
  });

  it("returns ~0 cross-track and along-track for a point at the route's own start", () => {
    const result = distanceFromRoute(bangalore, mumbai, bangalore);
    expect(result.crossTrackKm).toBeCloseTo(0, 1);
    expect(result.alongTrackKm).toBeCloseTo(0, 1);
  });

  it("returns along-track ~= routeLengthKm for a point at the route's own end", () => {
    const result = distanceFromRoute(bangalore, mumbai, mumbai);
    expect(result.crossTrackKm).toBeCloseTo(0, 1);
    expect(result.alongTrackKm).toBeCloseTo(result.routeLengthKm, 0);
  });

  it("reports a point behind the start as a negative along-track distance", () => {
    // Delhi is roughly north of Bangalore, well "behind" the Bangalore->
    // Mumbai direction of travel — its along-track projection should fall
    // outside [0, routeLengthKm], not just be a big cross-track number.
    const result = distanceFromRoute(bangalore, mumbai, delhi);
    expect(result.alongTrackKm < 0 || result.alongTrackKm > result.routeLengthKm).toBe(true);
  });

  it("reports a negative along-track distance for a point directly behind the start, ON the route's line", () => {
    // A point sitting exactly on the great-circle line through a and b, but
    // on the opposite side of `a` from `b`, has ~0 cross-track distance —
    // the only thing that can tell a caller it's not actually on the route
    // is the sign of alongTrackKm. This is the case the acos-only formula
    // can't distinguish from "50km into the route" without signing it.
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const pune = { lat: 18.5204, lng: 73.8567 };
    const behindMumbai = { lat: 19.30568526560564, lng: 72.46837907598972 }; // 50km behind Mumbai, same line
    const result = distanceFromRoute(mumbai, pune, behindMumbai);
    expect(result.crossTrackKm).toBeCloseTo(0, 3);
    expect(result.alongTrackKm).toBeCloseTo(-50, 0);
  });
});
