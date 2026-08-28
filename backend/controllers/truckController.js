const Truck = require("../models/truckModel");
const Trip = require("../models/tripModel");
const { notify } = require("../utils/notify");
const resolveDocuments = require("../utils/resolveDocuments");
const { logAdminAction } = require("../utils/audit");
const { findInFlightTrip } = require("../utils/truckInFlight");
const sendServerError = require("../utils/sendServerError");
const {
  registerTruckValidation,
  updateTruckValidation,
  addDocumentsValidation,
  addPhotosValidation,
  reviewTruckValidation,
} = require("../validators/truckValidation");

const registerTruck = async (req, res) => {
  try {
    const { error, value } = registerTruckValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { regNumber, truckType, bodyType, totalCapacity, documents = [], photos = [] } = value;

    const existing = await Truck.findOne({ regNumber });
    if (existing) {
      return res.status(409).json({ success: false, msg: "This registration number is already listed" });
    }

    // A transporter with three lorries used to be blocked here: only one
    // truck could sit in verification at a time, and only one could ever be
    // "active". That was us limiting someone's business on their behalf, so
    // it's gone — register as many vehicles as you actually run. The unique
    // index on regNumber still stops the same plate being listed twice.

    let resolvedDocuments = [];
    if (documents.length) {
      try {
        resolvedDocuments = await resolveDocuments(documents, req.auth.id);
      } catch (docError) {
        return res.status(400).json({ success: false, msg: docError.message });
      }
    }

    let resolvedPhotos = [];
    if (photos.length) {
      try {
        resolvedPhotos = await resolveDocuments(photos, req.auth.id);
      } catch (photoError) {
        return res.status(400).json({ success: false, msg: photoError.message });
      }
    }

    const truck = await Truck.create({
      owner: req.auth.id,
      regNumber,
      truckType,
      bodyType,
      totalCapacity,
      documents: resolvedDocuments,
      photos: resolvedPhotos,
      // Joi already guarantees this is `true` — registerTruckValidation
      // rejects anything else.
      authorizedToList: true,
      authorizedAt: new Date(),
    });

    res.status(201).json({ success: true, msg: "Truck registered", truck });
  } catch (error) {
    // The findOne check above is a courtesy fast-path, not a guarantee —
    // two concurrent registrations for the same regNumber can both pass it
    // before either commits. The schema's unique index is what actually
    // enforces this; without catching it here, a genuine race falls
    // through to a generic 500 instead of the same clean 409.
    if (error.code === 11000) {
      return res.status(409).json({ success: false, msg: "This registration number is already listed" });
    }
    sendServerError(res, error, "truckController");
  }
};

const listMyTrucks = async (req, res) => {
  try {
    const trucks = await Truck.find({ owner: req.auth.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, trucks });
  } catch (error) {
    sendServerError(res, error, "truckController");
  }
};

const updateTruck = async (req, res) => {
  try {
    // `value`, not req.body — regNumberSchema normalizes the plate as part
    // of validating it, and the change-detection below has to compare the
    // normalized form or "MH 12 AB 1234" would read as different from
    // "MH12AB1234" and pointlessly reset verification.
    const { error, value } = updateTruckValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    // A trip's own totalCapacity is fixed at post time (postTrip already
    // checks it against the truck's rating then) — but nothing stopped a
    // transporter from later shrinking the truck below what an already-live
    // trip committed to, leaving the truck's own "rated capacity" lying
    // about what it's actually carrying right now.
    if (req.body.totalCapacity !== undefined) {
      const oversizedTrip = await Trip.findOne({
        truck: req.params.id,
        status: { $in: ["published", "full", "ongoing"] },
        totalCapacity: { $gt: req.body.totalCapacity },
      }).select("totalCapacity");
      if (oversizedTrip) {
        return res.status(409).json({
          success: false,
          msg: `Can't reduce capacity below ${oversizedTrip.totalCapacity} tons — an active trip on this truck already committed to that much`,
        });
      }
    }

    const existing = await Truck.findOne({ _id: req.params.id, owner: req.auth.id });
    if (!existing) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }

    // value.regNumber is already normalized by the validator, so this
    // compares like for like — re-submitting the same plate formatted
    // differently ("MH 12 AB 1234") isn't a change and mustn't trip either
    // of the guards below.
    const updates = { ...value };
    const changingRegNumber = value.regNumber !== undefined && value.regNumber !== existing.regNumber;

    if (changingRegNumber) {
      // A run already underway is the one time the vehicle's identity is
      // frozen. The shipper whose load is aboard booked THIS plate, the
      // driver is carrying papers for it, and the trip record has to keep
      // naming the truck that actually ran it — so the change waits until
      // the delivery it promised is done.
      const inFlight = await findInFlightTrip(existing._id);
      if (inFlight) {
        const until = inFlight.estimatedArrivalAt || inFlight.departureAt;
        return res.status(409).json({
          success: false,
          msg: `${existing.regNumber} is on a trip right now (${inFlight.fromCity} → ${inFlight.toCity}). You can change its number once that delivery is complete${until ? ` — due ${until.toISOString().slice(0, 10)}` : ""}.`,
        });
      }

      // The RC, insurance and permit on file were issued against the old
      // plate, so they no longer evidence this vehicle. Sending the truck
      // back to pending is the honest outcome — the alternative is a
      // "verified" badge backed by documents for a different number.
      if (existing.status === "verified") {
        updates.status = "pending";
        updates.rejectReason = undefined;
        updates.reviewedBy = undefined;
        updates.reviewedAt = undefined;
      }
    }

    const truck = await Truck.findOneAndUpdate(
      { _id: existing._id, owner: req.auth.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      msg: changingRegNumber && updates.status === "pending"
        ? "Registration number updated — the truck needs re-verification since its documents name the old plate"
        : "Truck updated",
      truck,
    });
  } catch (error) {
    sendServerError(res, error, "truckController");
  }
};

// Adding documents to a previously rejected truck resubmits it for review (SRS-02.2)
const addDocuments = async (req, res) => {
  try {
    const { error } = addDocumentsValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const truck = await Truck.findOne({ _id: req.params.id, owner: req.auth.id });
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }

    let resolvedDocuments;
    try {
      resolvedDocuments = await resolveDocuments(req.body.documents, req.auth.id);
    } catch (docError) {
      return res.status(400).json({ success: false, msg: docError.message });
    }

    truck.documents.push(...resolvedDocuments);
    if (truck.status === "rejected") {
      truck.status = "pending";
      truck.rejectReason = undefined;
      truck.reviewedBy = undefined;
      truck.reviewedAt = undefined;
    }
    await truck.save();

    res.status(200).json({ success: true, msg: "Documents added", truck });
  } catch (error) {
    sendServerError(res, error, "truckController");
  }
};

// Adding photos never affects verification status — photos aren't KYC
// documents, so unlike addDocuments this doesn't touch truck.status.
const addPhotos = async (req, res) => {
  try {
    const { error } = addPhotosValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const truck = await Truck.findOne({ _id: req.params.id, owner: req.auth.id });
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }

    let resolvedPhotos;
    try {
      resolvedPhotos = await resolveDocuments(req.body.photos, req.auth.id);
    } catch (photoError) {
      return res.status(400).json({ success: false, msg: photoError.message });
    }

    truck.photos.push(...resolvedPhotos);
    await truck.save();

    res.status(200).json({ success: true, msg: "Photos added", truck });
  } catch (error) {
    sendServerError(res, error, "truckController");
  }
};

const listQueue = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const filter = status === "all" ? {} : { status };
    const trucks = await Truck.find(filter).populate("owner", "name mobile city").sort({ createdAt: 1 });
    res.status(200).json({ success: true, trucks });
  } catch (error) {
    sendServerError(res, error, "truckController");
  }
};

const reviewTruck = async (req, res) => {
  try {
    const { error } = reviewTruckValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }
    if (truck.status !== "pending") {
      return res.status(400).json({ success: false, msg: "This has already been reviewed" });
    }

    const rejectReason = req.body.status === "rejected" ? req.body.reason : undefined;
    const reviewedAt = new Date();

    // Atomic — status is part of the filter, not just the read above, so
    // two admins (or one admin double-clicking / two open tabs) reviewing
    // the same pending truck concurrently can't both flip it, firing
    // duplicate audit entries/notifications and possibly landing on
    // whichever decision's .save() happened to run last.
    const previous = await Truck.findOneAndUpdate(
      { _id: truck._id, status: "pending" },
      {
        $set: {
          status: req.body.status,
          rejectReason,
          reviewedBy: req.auth.id,
          reviewedAt,
        },
      },
      { new: false }
    );
    if (!previous) {
      return res.status(400).json({ success: false, msg: "This has already been reviewed" });
    }
    truck.status = req.body.status;
    truck.rejectReason = rejectReason;
    truck.reviewedBy = req.auth.id;
    truck.reviewedAt = reviewedAt;

    await logAdminAction({
      actor: req.auth.id,
      action: "truck.review",
      targetType: "Truck",
      targetId: truck._id,
      before: { status: previous.status },
      after: { status: truck.status },
      reason: truck.rejectReason,
      scope: req.auth.adminScope,
    });

    await notify(truck.owner, "truck_status_changed", {
      truckId: truck._id,
      regNumber: truck.regNumber,
      status: truck.status,
      reason: truck.rejectReason,
    });

    // A verified candidate joins the owner's usable fleet. It no longer
    // pushes the owner's other trucks out to make room — that swap was the
    // "one driver = one active truck" rule, and a transporter who buys a
    // second lorry shouldn't lose the first one by registering it.
    // "inactive" now means only what its name says: retired, kept forever so
    // past trips stay resolvable, never reachable for a new one.
    if (truck.status === "verified" && truck.lifecycle === "candidate") {
      await Truck.updateOne({ _id: truck._id }, { $set: { lifecycle: "active" } });
      truck.lifecycle = "active";
    }

    // A trip created while this truck was still pending (tripController.
    // postTrip) was saved as a draft rather than blocked — now that the
    // truck is verified, publish it automatically so the transporter
    // doesn't have to come back and resubmit. Skips a draft whose
    // departure already passed while it sat in review — that one needs a
    // human to update the date, not a silent auto-publish into the past.
    // (New draft trips can no longer be created — postTrip now hard-blocks
    // until the truck is active — but this stays for any legacy data.)
    if (truck.status === "verified") {
      const draftTrips = await Trip.find({ truck: truck._id, status: "draft", departureAt: { $gt: new Date() } });
      await Promise.all(
        draftTrips.map(async (trip) => {
          trip.status = "published";
          await trip.save();
          await notify(trip.transporter, "trip_auto_published", {
            tripId: trip._id,
            fromCity: trip.fromCity,
            toCity: trip.toCity,
          });
        })
      );
    }

    res.status(200).json({ success: true, msg: "Truck reviewed", truck });
  } catch (error) {
    sendServerError(res, error, "truckController");
  }
};

module.exports = {
  registerTruck,
  listMyTrucks,
  updateTruck,
  addDocuments,
  addPhotos,
  listQueue,
  reviewTruck,
};
