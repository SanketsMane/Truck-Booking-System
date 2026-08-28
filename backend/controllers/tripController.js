const Trip = require("../models/tripModel");
const Truck = require("../models/truckModel");
const Booking = require("../models/bookingModel");
const Verification = require("../models/verificationModel");
const SavedSearch = require("../models/savedSearchModel");
const { notify } = require("../utils/notify");
const { markBookingCancelled } = require("../utils/bookingCancellation");
const escapeRegex = require("../utils/escapeRegex");
const setLocationGeo = require("../utils/setLocationGeo");
const { getPendingHeldMap, visibleAvailable } = require("../utils/capacityHelpers");
const { locateOnPath } = require("../utils/routeGeo");
const PlatformSetting = require("../models/platformSettingModel");
const { recordTripSearch } = require("../utils/searchLogger");
const {
  SEARCH_DATE_RANGE_DAYS,
  SEARCH_FORWARD_HORIZON_DAYS,
  SEARCH_RADIUS_KM_DEFAULT,
  ROUTE_CORRIDOR_KM,
  ROUTE_ENDPOINT_SLACK_KM,
} = require("../config/marketplaceConfig");
const { postTripValidation, editTripValidation, searchAlertValidation } = require("../validators/tripValidation");
const sendServerError = require("../utils/sendServerError");

const EARTH_RADIUS_KM = 6371;

const cityMatch = (city) => new RegExp(`^${escapeRegex(city.trim())}$`, "i");

// Whole-word so "Pur" doesn't match "Jaipur" — stop addresses are free
// text ("Pune warehouse", "NH48 near Vadodara"), not clean city fields, so
// a bare substring test would produce nonsense matches.
const cityWordMatch = (city) => new RegExp(`\\b${escapeRegex(city.trim())}\\b`, "i");

// A typed search carries no coordinates, so the database filter IS the whole
// match — and it has to look at stops too, or a Mumbai->Nagpur truck that
// stops at Pune never surfaces for someone typing "Pune". Direction isn't
// checked here (a $or can't express ordering); tripLegPosition below does
// that in JS once the candidates are loaded.
const cityAnywhereFilter = (city) => ({
  $or: [
    { fromCityNormalized: city.trim().toLowerCase() },
    { toCityNormalized: city.trim().toLowerCase() },
    { "stops.address": cityWordMatch(city) },
  ],
});

// Where a searched city sits along a trip's actual run, by name:
// 0 = origin, 1..n = each stop in order, n+1 = destination, -1 = not on it.
// Comparing two of these is what tells a leg travelling WITH the truck from
// one travelling against it.
const tripLegPosition = (trip, city) => {
  const re = cityWordMatch(city);
  const labels = [trip.fromCity, ...(trip.stops || []).map((stop) => stop.address), trip.toCity];
  return labels.findIndex((label) => re.test(String(label || "")));
};

// The trip's route as an ordered polyline: pickup -> stops -> drop. Returns
// null unless both endpoints are geocoded — a route with no known start or
// end can't be corridor-matched at all. Stops missing coordinates (typed
// freehand rather than picked from autocomplete) are simply skipped: the
// path stays valid, it just bends less accurately around them.
const tripPathPoints = (trip) => {
  const start = trip.pickupPoint;
  const end = trip.dropPoint;
  if (!(start?.lat != null && start?.lng != null && end?.lat != null && end?.lng != null)) return null;

  const via = (trip.stops || [])
    .filter((stop) => stop?.lat != null && stop?.lng != null)
    .map((stop) => ({ lat: stop.lat, lng: stop.lng }));

  return [{ lat: start.lat, lng: start.lng }, ...via, { lat: end.lat, lng: end.lng }];
};

const notifyMatchingSavedSearches = async (trip) => {
  const windowMs = SEARCH_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
  const matches = await SavedSearch.find({
    fromCity: cityMatch(trip.fromCity),
    toCity: cityMatch(trip.toCity),
    notified: false,
    date: {
      $gte: new Date(trip.departureAt.getTime() - windowMs),
      $lte: new Date(trip.departureAt.getTime() + windowMs),
    },
  });

  await Promise.all(
    matches.map(async (match) => {
      await notify(match.user, "saved_search_match", {
        tripId: trip._id,
        fromCity: trip.fromCity,
        toCity: trip.toCity,
        departureAt: trip.departureAt,
      });
      match.notified = true;
      await match.save();
    })
  );
};

// A trip can be posted against ANY verified truck the transporter owns —
// a fleet, not one nominated vehicle. Only two things are checked: the
// truck itself passed KYC review, and it hasn't been retired. Driver
// person-level KYC (Verification type "transporter") now follows the same
// admin-controlled PlatformSetting.verificationGateEnabled switch that
// governs the shipper side in bookingController.acceptBooking, instead of
// being the one gate in the app that ignored it. With the gate off (the
// default) verification is a badge shippers weigh for themselves — getTrip
// returns transporterVerified either way.
const postTrip = async (req, res) => {
  try {
    const { error } = postTripValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { truckId, totalCapacity, availableCapacity } = req.body;

    const truck = await Truck.findOne({ _id: truckId, owner: req.auth.id });
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }
    // Any verified truck in the owner's fleet can carry a trip. This used
    // to insist on the single "active" one, which meant a transporter
    // running three lorries had to nominate one and leave the rest idle —
    // a restriction on their own business, enforced by us for no benefit.
    // A retired truck is still excluded: it's kept as history so old trips
    // stay resolvable, not as usable fleet.
    if (truck.status !== "verified") {
      return res.status(400).json({
        success: false,
        msg: "This truck is still awaiting verification — you can post trips on it once it's approved",
      });
    }
    if (truck.lifecycle === "inactive") {
      return res.status(400).json({
        success: false,
        msg: "This truck has been retired — pick one of your current trucks instead",
      });
    }
    if (totalCapacity > truck.totalCapacity) {
      return res.status(400).json({
        success: false,
        msg: `Trip capacity can't exceed the truck's rated capacity (${truck.totalCapacity} tons)`,
      });
    }

    // Driver KYC used to hard-block every trip unconditionally — the one
    // gate in the app that ignored verificationGateEnabled entirely, so an
    // admin who had deliberately turned verification off still couldn't let
    // a driver post. It now honours that same switch (off by default), which
    // means verification is a badge shippers can weigh for themselves unless
    // an admin decides otherwise. tripController.getTrip already surfaces
    // transporterVerified either way.
    const { verificationGateEnabled } = await PlatformSetting.getSettings();
    if (verificationGateEnabled) {
      const transporterKyc = await Verification.findOne({ user: req.auth.id, type: "transporter" });
      if (!transporterKyc || transporterKyc.status !== "verified") {
        return res.status(403).json({ success: false, msg: "Complete driver verification before posting a trip" });
      }
    }

    const trip = await Trip.create({
      truck: truck._id,
      transporter: req.auth.id,
      fromCity: req.body.fromCity,
      toCity: req.body.toCity,
      fromCityNormalized: req.body.fromCity.trim().toLowerCase(),
      toCityNormalized: req.body.toCity.trim().toLowerCase(),
      departureAt: req.body.departureAt,
      estimatedArrivalAt: req.body.estimatedArrivalAt,
      pickupPoint: setLocationGeo({ ...req.body.pickupPoint }),
      dropPoint: setLocationGeo({ ...req.body.dropPoint }),
      stops: (req.body.stops || []).map((stop) => setLocationGeo({ ...stop })),
      totalCapacity,
      availableCapacity,
      pricePerTon: req.body.pricePerTon,
      status: "published",
    });

    await notifyMatchingSavedSearches(trip);

    res.status(201).json({ success: true, msg: "Trip published", trip });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// FR-04.1 / SRS-04.1 — exact city match, date within a configurable window,
// soonest-departure by default. City match is against fromCityNormalized/
// toCityNormalized (trimmed+lowercased at write time) rather than a regex
// on the display fields, so this gets a real index seek — see the compound
// index in models/tripModel.js.
//
// Optional radius mode: nearLat/nearLng (+radiusKm, default
// SEARCH_RADIUS_KM_DEFAULT) matches trips whose pickup point falls within
// that radius, via the 2dsphere index on pickupPoint.location. Independent
// of city search — either mode alone is enough to satisfy the "where"
// requirement, and both can combine to narrow further.
//
// Route-corridor mode: when the search also carries fromLat/fromLng/toLat/
// toLng (the shipper picked a real suggestion or used "current location",
// not just typed a bare city name), a trip whose named cities DON'T match
// is still included if the searched pickup and drop points both fall near
// enough to — and in the right order along — the truck's own straight-line
// pickup->drop path (utils/routeGeo.js). This is the actual, intended
// behavior: a truck posted as Bangalore->Mumbai should be findable by a
// Pune->Mumbai search, since Pune sits ~45km off that route, not a
// different route entirely. Exact-city trips are always included
// regardless (a strict subset of what the corridor check would find
// anyway); the corridor check only ever adds more results, never removes
// the exact match. Each returned trip carries a `matchType` ("exact" |
// "route" | "near") so the frontend can tell shippers when a result isn't
// a literal door-to-door match.
const searchTrips = async (req, res) => {
  try {
    const {
      fromCity,
      toCity,
      fromLat,
      fromLng,
      toLat,
      toLng,
      date,
      nearLat,
      nearLng,
      radiusKm,
      minCapacity,
      sort = "departure",
      rangeDays,
    } = req.query;

    const hasCitySearch = Boolean(fromCity && toCity);
    const hasNearSearch = nearLat !== undefined && nearLng !== undefined;
    if (!hasCitySearch && !hasNearSearch) {
      return res.status(400).json({
        success: false,
        msg: "Provide either fromCity and toCity, or nearLat and nearLng",
      });
    }
    if (!date) {
      return res.status(400).json({ success: false, msg: "date is required" });
    }

    // IST is UTC+5:30 with no DST, and the frontend always sends a plain
    // YYYY-MM-DD date with no time/zone — parsing that directly with
    // `new Date(...)` anchors it at UTC midnight, which is 5:30am IST, not
    // the start of the India calendar day a shipper actually means when
    // they pick "20 Aug". Anchoring at IST midnight instead keeps the
    // ±windowDays range centered on the real day, not shifted by 5.5 hours.
    const searchDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00+05:30`) : new Date(date);
    if (Number.isNaN(searchDate.getTime())) {
      return res.status(400).json({ success: false, msg: "Invalid date" });
    }

    // The searched date is where the shipper wants to START looking, not a
    // cage around them. A trip on the exact same lane three days later used
    // to be invisible, which made a live route look empty and cost the
    // transporter a booking they had capacity for — so by default every
    // departure from that day onward matches. rangeDays is now purely an
    // opt-in narrowing for a shipper who genuinely only wants that window.
    const narrowDays = Number(rangeDays) > 0 ? Number(rangeDays) : null;
    const windowMs = (narrowDays ?? SEARCH_DATE_RANGE_DAYS) * 24 * 60 * 60 * 1000;
    const departureWindow =
      narrowDays === null
        ? {
            $gte: searchDate,
            $lte: new Date(searchDate.getTime() + SEARCH_FORWARD_HORIZON_DAYS * 24 * 60 * 60 * 1000),
          }
        : {
            $gte: new Date(searchDate.getTime() - windowMs),
            $lte: new Date(searchDate.getTime() + windowMs),
          };

    const fromCoord = { lat: Number(fromLat), lng: Number(fromLng) };
    const toCoord = { lat: Number(toLat), lng: Number(toLng) };
    const hasRouteCoords =
      hasCitySearch && [fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng].every(Number.isFinite);

    const filter = {
      status: "published",
      availableCapacity: { $gte: Number(minCapacity) || 0 },
      departureAt: departureWindow,
    };

    // Narrowing at the DB level is only safe when there are no coordinates
    // to corridor-match with — with them, an exact-city trip is just one
    // outcome the path check below re-derives anyway, and filtering here
    // would wrongly drop every corridor-only match before JS sees it.
    //
    // The coordinate-free filter now spans stops as well as the two
    // endpoints, so a leg of a longer run is reachable by typing its city
    // names. Ordering is still settled in JS.
    if (hasCitySearch && !hasRouteCoords) {
      filter.$and = [cityAnywhereFilter(fromCity), cityAnywhereFilter(toCity)];
    }

    if (hasNearSearch) {
      const lat = Number(nearLat);
      const lng = Number(nearLng);
      const radius = Number(radiusKm) || SEARCH_RADIUS_KM_DEFAULT;
      if (Number.isNaN(lat) || Number.isNaN(lng) || radius <= 0) {
        return res.status(400).json({ success: false, msg: "nearLat/nearLng/radiusKm must be valid numbers" });
      }
      filter["pickupPoint.location"] = { $geoWithin: { $centerSphere: [[lng, lat], radius / EARTH_RADIUS_KM] } };
    }

    let query = Trip.find(filter)
      .populate("truck", "truckType bodyType totalCapacity photos")
      .populate("transporter", "name city ratingAvg ratingCount");

    if (sort === "price") query = query.sort({ pricePerTon: 1 });
    else if (sort === "departure") query = query.sort({ departureAt: 1 });

    const trips = await query.exec();

    // Pairs each trip with why it matched, rather than mutating the
    // Mongoose document with an unmodeled property — matchType travels
    // alongside the doc through sort/visibility below instead.
    let matched;
    if (!hasCitySearch) {
      matched = trips.map((trip) => ({ trip, matchType: "near" }));
    } else {
      const fromNorm = fromCity.trim().toLowerCase();
      const toNorm = toCity.trim().toLowerCase();
      matched = trips
        .map((trip) => {
          if (trip.fromCityNormalized === fromNorm && trip.toCityNormalized === toNorm) {
            return { trip, matchType: "exact" };
          }

          // A leg of a longer run: both cities are named somewhere along
          // the trip — origin, a stop, or destination — and in the order
          // the driver actually reaches them. Checked before the corridor
          // test because it's the stronger claim: the transporter typed
          // that stop in themselves, no geometry is being inferred.
          const fromLeg = tripLegPosition(trip, fromCity);
          const toLeg = tripLegPosition(trip, toCity);
          if (fromLeg !== -1 && toLeg !== -1 && fromLeg < toLeg) {
            return { trip, matchType: "stop" };
          }

          if (!hasRouteCoords) return null;

          const path = tripPathPoints(trip);
          if (!path) return null;

          // Both ends must sit within the corridor of the SAME run, and the
          // drop must come after the pickup along it — otherwise a truck
          // heading the opposite way down the same highway would match.
          const fromHit = locateOnPath(path, fromCoord, ROUTE_ENDPOINT_SLACK_KM);
          const toHit = locateOnPath(path, toCoord, ROUTE_ENDPOINT_SLACK_KM);
          const onRoute =
            fromHit &&
            toHit &&
            fromHit.crossTrackKm <= ROUTE_CORRIDOR_KM &&
            toHit.crossTrackKm <= ROUTE_CORRIDOR_KM &&
            toHit.alongTrackKm > fromHit.alongTrackKm;

          return onRoute ? { trip, matchType: "route" } : null;
        })
        .filter(Boolean);
    }

    if (sort === "rating") {
      matched = matched.sort((a, b) => (b.trip.transporter?.ratingAvg || 0) - (a.trip.transporter?.ratingAvg || 0));
    }

    // SRS-05.1 — capacity already claimed by other shippers' pending
    // requests should be visible here, not just enforced silently when a
    // new request is submitted.
    const heldMap = await getPendingHeldMap(matched.map(({ trip }) => trip._id));
    const tripsWithVisibility = matched.map(({ trip, matchType }) => ({
      ...trip.toObject(),
      visibleAvailableCapacity: visibleAvailable(trip, heldMap),
      matchType,
    }));

    res.status(200).json({ success: true, trips: tripsWithVisibility, count: tripsWithVisibility.length });

    // Demand telemetry for the admin route-analytics module — recorded
    // AFTER the response is sent and deliberately not awaited, so neither a
    // slow write nor a failing one can add latency to a search or turn a
    // working one into an error. `matched` is what the searcher actually
    // saw, so a zero-result row here is a genuine unserved lane.
    recordTripSearch(req, {
      searchType: hasCitySearch ? "route" : "near",
      searchDate,
      matched,
    });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const popularRoutes = async (req, res) => {
  try {
    const routes = await Trip.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: { fromCity: "$fromCity", toCity: "$toCity" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, fromCity: "$_id.fromCity", toCity: "$_id.toCity", count: 1 } },
    ]);
    res.status(200).json({ success: true, routes });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const getTrip = async (req, res) => {
  try {
    // Public, unauthenticated endpoint — never expose the truck's KYC
    // documents, verification history, or reviewing admin's identity here.
    // photos are safe to include: they're isPublic UploadedFile records,
    // unlike documents (rc/insurance/permit), which stay excluded.
    const trip = await Trip.findById(req.params.id)
      .populate("truck", "regNumber truckType bodyType totalCapacity status photos")
      .populate("transporter", "name city ratingAvg ratingCount createdAt");
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }

    const heldMap = await getPendingHeldMap([trip._id]);
    // Just the boolean, not the transporter's KYC documents/history — same
    // "no document exposure on this public endpoint" boundary the existing
    // comment above already draws for the truck's own fields.
    const transporterKyc = await Verification.findOne({ user: trip.transporter._id, type: "transporter" }).select("status");
    const tripWithVisibility = {
      ...trip.toObject(),
      visibleAvailableCapacity: visibleAvailable(trip, heldMap),
      transporterVerified: transporterKyc?.status === "verified",
    };

    res.status(200).json({ success: true, trip: tripWithVisibility });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const listMyTrips = async (req, res) => {
  try {
    const filter = { transporter: req.auth.id };
    if (req.query.status) filter.status = req.query.status;
    const trips = await Trip.find(filter).populate("truck", "regNumber truckType photos status").sort({ createdAt: -1 });
    res.status(200).json({ success: true, trips });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// SRS-03.4 — capacity/price editable on an unbooked or partially-booked
// trip; total capacity may never drop below what's already confirmed.
const editTrip = async (req, res) => {
  try {
    const { error } = editTripValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const trip = await Trip.findOne({ _id: req.params.id, transporter: req.auth.id });
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }
    if (!["draft", "published", "full"].includes(trip.status)) {
      return res.status(400).json({ success: false, msg: `Trip can't be edited while ${trip.status}` });
    }

    const otherFields = {};
    ["departureAt", "estimatedArrivalAt", "pickupPoint", "dropPoint", "stops", "pricePerTon"].forEach((field) => {
      if (req.body[field] !== undefined) otherFields[field] = req.body[field];
    });
    if (otherFields.pickupPoint) otherFields.pickupPoint = setLocationGeo({ ...otherFields.pickupPoint });
    if (otherFields.dropPoint) otherFields.dropPoint = setLocationGeo({ ...otherFields.dropPoint });
    // Sent as the whole replacement list — an empty array is a real edit
    // ("this run is direct after all"), not a missing field, so it must not
    // be treated as "leave stops alone".
    if (otherFields.stops) otherFields.stops = otherFields.stops.map((stop) => setLocationGeo({ ...stop }));

    let updated = trip;

    // Changing totalCapacity by X changes availableCapacity by the same X,
    // regardless of how much is currently booked — so this can be applied
    // as a single atomic $inc that composes correctly with a concurrent
    // acceptBooking/cancelBooking capacity change instead of racing a
    // stale read-then-write against them. The $gte guard is exactly
    // "the resulting availableCapacity won't go negative."
    if (req.body.totalCapacity !== undefined) {
      const delta = req.body.totalCapacity - updated.totalCapacity;
      const result = await Trip.findOneAndUpdate(
        { _id: trip._id, transporter: req.auth.id, availableCapacity: { $gte: -delta } },
        { $inc: { totalCapacity: delta, availableCapacity: delta } },
        { new: true }
      );
      if (!result) {
        const bookedCapacity = updated.totalCapacity - updated.availableCapacity;
        return res.status(409).json({
          success: false,
          msg: `Can't reduce capacity below the ~${bookedCapacity} tons already booked`,
        });
      }
      updated = result;
    }

    if (Object.keys(otherFields).length) {
      updated = await Trip.findOneAndUpdate(
        { _id: trip._id, transporter: req.auth.id },
        { $set: otherFields },
        { new: true }
      );
    }

    // Only toggle between published/full — a draft trip stays draft no
    // matter what capacity/price/date edits happen to it. It only ever
    // becomes published via truckController.reviewTruck's auto-publish,
    // once the truck it's waiting on is actually verified.
    if (["published", "full"].includes(updated.status)) {
      const nextStatus = updated.availableCapacity > 0 ? "published" : "full";
      if (updated.status !== nextStatus) {
        updated.status = nextStatus;
        await updated.save();
      }
    }

    res.status(200).json({ success: true, msg: "Trip updated", trip: updated });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

// SRS-03.5 — cancelling a trip with confirmed bookings cancels those
// bookings too (refunding any that were paid) and notifies each affected
// shipper. A booking already in transit ("ongoing" — pickup confirmed,
// goods loaded) can't be undone by cancelling the trip around it, so that's
// blocked outright rather than left dangling with no valid next state.
const cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, transporter: req.auth.id });
    if (!trip) {
      return res.status(404).json({ success: false, msg: "Trip not found" });
    }
    if (["completed", "cancelled", "expired"].includes(trip.status)) {
      return res.status(400).json({ success: false, msg: `Trip is already ${trip.status}` });
    }

    const ongoingCount = await Booking.countDocuments({ trip: trip._id, status: "ongoing" });
    if (ongoingCount > 0) {
      return res.status(400).json({
        success: false,
        msg: "This trip has goods already picked up and in transit — it can't be cancelled until delivery is confirmed",
      });
    }

    trip.status = "cancelled";
    await trip.save();

    const affectedBookings = await Booking.find({ trip: trip._id, status: { $in: ["pending", "confirmed"] } });
    await Promise.all(
      affectedBookings.map(async (booking) => {
        await markBookingCancelled(booking, {
          cancelledBy: req.auth.id,
          reason: "Trip cancelled by transporter",
        });
        await notify(booking.shipper, "booking_cancelled", { bookingId: booking._id, tripId: trip._id });
      })
    );

    res.status(200).json({ success: true, msg: "Trip cancelled", trip });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

const saveSearchAlert = async (req, res) => {
  try {
    const { error } = searchAlertValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const alert = await SavedSearch.create({ user: req.auth.id, ...req.body });
    res.status(201).json({ success: true, msg: "We'll notify you when a matching trip is posted", alert });
  } catch (error) {
    sendServerError(res, error, "tripController");
  }
};

module.exports = {
  postTrip,
  searchTrips,
  popularRoutes,
  getTrip,
  listMyTrips,
  editTrip,
  cancelTrip,
  saveSearchAlert,
};
