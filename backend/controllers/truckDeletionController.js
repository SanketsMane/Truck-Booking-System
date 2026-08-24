const Truck = require("../models/truckModel");
const Trip = require("../models/tripModel");
const TruckDeleteRequest = require("../models/truckDeleteRequestModel");
const DeletedTruck = require("../models/deletedTruckModel");
const { notify } = require("../utils/notify");
const { logAdminAction } = require("../utils/audit");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const escapeRegex = require("../utils/escapeRegex");
const sendServerError = require("../utils/sendServerError");
const {
  raiseTruckDeleteRequestValidation,
  resolveTruckDeleteRequestValidation,
  deleteTruckValidation,
} = require("../validators/truckDeleteRequestValidation");

// Shared by both "admin approves a transporter's request" and "admin
// deletes a truck directly" — same guard, same archive write, same audit
// trail either way, so the logic lives in one place rather than being
// duplicated per caller. Mirrors adminController.deactivateTrip's
// dependent-live-state guard (409 instead of silently orphaning a trip).
//
// The guard checks for ANY trip ever, not just a currently live one — a
// vehicle with trip history is a permanent record (Trip.truck has no
// cascade/nullify on delete), so once a truck has ever been used for a
// listing it can never be hard-deleted, only deactivated (see
// truckController.reviewTruck's lifecycle flip). Only a truck that was
// registered but never actually posted a trip is deletable.
const performTruckDeletion = async ({ truck, reason, deletedBy, deleteRequest = null, adminScope }) => {
  const hasTripHistory = await Trip.exists({ truck: truck._id });
  if (hasTripHistory) {
    const err = new Error(
      "This truck has trip history and can't be deleted — it stays on record as inactive so past trips remain valid."
    );
    err.status = 409;
    throw err;
  }

  await Truck.deleteOne({ _id: truck._id });

  const archived = await DeletedTruck.create({
    regNumber: truck.regNumber,
    truckType: truck.truckType,
    owner: truck.owner,
    reason,
    deleteRequest,
    deletedBy,
  });

  await logAdminAction({
    actor: deletedBy,
    action: "truck.delete",
    targetType: "Truck",
    targetId: truck._id,
    before: { regNumber: truck.regNumber, truckType: truck.truckType, owner: truck.owner },
    reason,
    scope: adminScope,
  });

  return archived;
};

const raiseDeleteRequest = async (req, res) => {
  try {
    const { error, value } = raiseTruckDeleteRequestValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const truck = await Truck.findOne({ _id: req.params.id, owner: req.auth.id });
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }

    const existingPending = await TruckDeleteRequest.findOne({ truck: truck._id, status: "pending" });
    if (existingPending) {
      return res.status(409).json({ success: false, msg: "A deletion request for this truck is already pending" });
    }

    const request = await TruckDeleteRequest.create({
      truck: truck._id,
      regNumber: truck.regNumber,
      requestedBy: req.auth.id,
      reason: value.reason,
    });

    res.status(201).json({ success: true, msg: "Deletion request submitted — an admin will review it", request });
  } catch (error) {
    sendServerError(res, error, "truckDeletionController");
  }
};

const listMyDeleteRequests = async (req, res) => {
  try {
    const requests = await TruckDeleteRequest.find({ requestedBy: req.auth.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    sendServerError(res, error, "truckDeletionController");
  }
};

// Read, so left open to any admin scope (only resolveDeleteRequest/
// deleteTruckDirect below are "full"-scoped), matching listTrucks/
// listAllDisputes.
const listAllDeleteRequests = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      TruckDeleteRequest.find(filter)
        .populate("requestedBy", "name email mobile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TruckDeleteRequest.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "truckDeletionController");
  }
};

// Claims the pending->resolved transition atomically FIRST (so two
// concurrent resolves — a double-click, or two "full"-scope admins — can't
// both proceed to performTruckDeletion for the same request), then performs
// the actual deletion for the approve path. If the deletion is blocked (an
// active trip on the truck), the claim is rolled back to "pending" so the
// admin can retry after clearing the trip — mirrors the plan's intent that
// a guard failure shouldn't leave the request stuck in a half-resolved state.
const resolveDeleteRequest = async (req, res) => {
  try {
    const { error, value } = resolveTruckDeleteRequestValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const claimed = await TruckDeleteRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status: value.status,
          resolvedBy: req.auth.id,
          resolvedAt: new Date(),
          resolutionNote: value.resolutionNote,
        },
      },
      { new: true }
    ).populate("truck");

    if (!claimed) {
      const existing = await TruckDeleteRequest.findById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, msg: "Delete request not found" });
      return res.status(400).json({ success: false, msg: `Request is already ${existing.status}` });
    }

    if (value.status === "approved") {
      if (!claimed.truck) {
        await TruckDeleteRequest.updateOne({ _id: claimed._id }, { $set: { status: "pending" } });
        return res.status(400).json({ success: false, msg: "The truck this request refers to no longer exists" });
      }

      try {
        await performTruckDeletion({
          truck: claimed.truck,
          reason: value.resolutionNote || claimed.reason,
          deletedBy: req.auth.id,
          deleteRequest: claimed._id,
          adminScope: req.auth.adminScope,
        });
      } catch (deleteError) {
        await TruckDeleteRequest.updateOne({ _id: claimed._id }, { $set: { status: "pending" } });
        if (deleteError.status) {
          return res.status(deleteError.status).json({ success: false, msg: deleteError.message });
        }
        throw deleteError;
      }
    }

    await notify(claimed.requestedBy, "truck_delete_request_resolved", {
      regNumber: claimed.regNumber,
      status: value.status,
      resolutionNote: value.resolutionNote,
    });

    res.status(200).json({ success: true, msg: "Request resolved", request: claimed });
  } catch (error) {
    sendServerError(res, error, "truckDeletionController");
  }
};

const deleteTruckDirect = async (req, res) => {
  try {
    const { error, value } = deleteTruckValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      return res.status(404).json({ success: false, msg: "Truck not found" });
    }

    try {
      await performTruckDeletion({
        truck,
        reason: value.reason,
        deletedBy: req.auth.id,
        adminScope: req.auth.adminScope,
      });
    } catch (deleteError) {
      if (deleteError.status) {
        return res.status(deleteError.status).json({ success: false, msg: deleteError.message });
      }
      throw deleteError;
    }

    await notify(truck.owner, "truck_deleted", { regNumber: truck.regNumber, reason: value.reason });

    res.status(200).json({ success: true, msg: "Truck deleted" });
  } catch (error) {
    sendServerError(res, error, "truckDeletionController");
  }
};

const listDeletedTrucks = async (req, res) => {
  try {
    const { search } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (search) {
      filter.regNumber = new RegExp(escapeRegex(search), "i");
    }

    const [items, total] = await Promise.all([
      DeletedTruck.find(filter)
        .populate("owner", "name email")
        .populate("deletedBy", "name email")
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit),
      DeletedTruck.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "truckDeletionController");
  }
};

module.exports = {
  raiseDeleteRequest,
  listMyDeleteRequests,
  listAllDeleteRequests,
  resolveDeleteRequest,
  deleteTruckDirect,
  listDeletedTrucks,
};
