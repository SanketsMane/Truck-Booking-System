const { applyWalletEntry, withWalletSession } = require("./walletService");

// Shared refund-then-cancel logic for every path that can cancel a booking
// (shipper/transporter self-cancel, a trip-cancel cascading to its
// bookings, admin force-cancel) — a paid booking must never just get
// flipped to "cancelled" with the shipper's money still marked "paid" and
// no ledger trace of a refund. A "pending" booking is never paid (payment
// only opens up once a booking reaches "confirmed"), so calling this on
// one is safe too — wasPaid just comes back false and no wallet entry is
// created.
//
// Capacity release (only relevant when the trip itself stays active — a
// cancelled trip's capacity no longer matters) and notifications are left
// to the caller, since those differ by context.
const cancelBookingWithRefund = async (booking, { cancelledBy, reason }) => {
  const wasPaid = booking.paymentStatus === "paid";

  await withWalletSession(async (session) => {
    if (wasPaid) {
      await applyWalletEntry({
        walletFilter: { ownerType: "user", user: booking.shipper },
        amount: booking.priceEstimate,
        direction: "credit",
        type: "refund",
        booking: booking._id,
        session,
      });
      booking.paymentStatus = "refunded";
    }

    booking.status = "cancelled";
    booking.cancelledBy = cancelledBy;
    booking.cancelReason = reason;
    await booking.save({ session });
  });

  return { wasPaid };
};

module.exports = { cancelBookingWithRefund };
