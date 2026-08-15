const mongoose = require("mongoose");
const Booking = require("../../models/bookingModel");
const { getPendingHeldMap, visibleAvailable, visibleAvailableVolume } = require("../../utils/capacityHelpers");

const objectId = () => new mongoose.Types.ObjectId();

describe("capacityHelpers", () => {
  it("returns an empty map for no trip ids", async () => {
    const map = await getPendingHeldMap([]);
    expect(map.size).toBe(0);
  });

  it("sums held capacity and volume across pending bookings per trip, ignoring non-pending ones", async () => {
    const trip1 = objectId();
    const trip2 = objectId();
    await Booking.create([
      {
        trip: trip1,
        shipper: objectId(),
        capacityRequested: 5,
        volumeRequested: 10,
        goodsDescription: "x",
        pickupPoint: { address: "a" },
        priceEstimate: 100,
        status: "pending",
      },
      {
        trip: trip1,
        shipper: objectId(),
        capacityRequested: 3,
        goodsDescription: "x",
        pickupPoint: { address: "a" },
        priceEstimate: 100,
        status: "pending",
      },
      {
        trip: trip1,
        shipper: objectId(),
        capacityRequested: 999,
        goodsDescription: "x",
        pickupPoint: { address: "a" },
        priceEstimate: 100,
        status: "confirmed",
      },
      {
        trip: trip2,
        shipper: objectId(),
        capacityRequested: 2,
        goodsDescription: "x",
        pickupPoint: { address: "a" },
        priceEstimate: 100,
        status: "pending",
      },
    ]);

    const map = await getPendingHeldMap([trip1, trip2]);
    expect(map.get(String(trip1))).toEqual({ capacity: 8, volume: 10 });
    expect(map.get(String(trip2))).toEqual({ capacity: 2, volume: 0 });
  });

  it("visibleAvailable subtracts held capacity and floors at zero", () => {
    const id = objectId();
    const heldMap = new Map([[String(id), { capacity: 8, volume: 0 }]]);
    expect(visibleAvailable({ _id: id, availableCapacity: 10 }, heldMap)).toBe(2);
    expect(visibleAvailable({ _id: id, availableCapacity: 5 }, heldMap)).toBe(0);
  });

  it("visibleAvailableVolume returns null when the trip doesn't track volume", () => {
    const id = objectId();
    const heldMap = new Map([[String(id), { capacity: 0, volume: 4 }]]);
    expect(visibleAvailableVolume({ _id: id, availableVolumeCbm: null }, heldMap)).toBeNull();
    expect(visibleAvailableVolume({ _id: id, availableVolumeCbm: undefined }, heldMap)).toBeNull();
  });

  it("visibleAvailableVolume subtracts held volume when the trip tracks it", () => {
    const id = objectId();
    const heldMap = new Map([[String(id), { capacity: 0, volume: 4 }]]);
    expect(visibleAvailableVolume({ _id: id, availableVolumeCbm: 10 }, heldMap)).toBe(6);
  });
});
