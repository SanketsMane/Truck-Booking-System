// Lazily injects Razorpay's Checkout script on first use — most traffic
// (anonymous browsing on Home/SearchResults/TripDetail) never touches
// payments, so there's no reason to load ~150KB on every page. The module-
// level promise cache means repeat "Pay"/"Add money" clicks across the
// session reuse the same load instead of re-injecting the script.
let loadPromise = null;

export const loadRazorpayCheckout = () => {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Could not load Razorpay checkout — check your connection and try again"));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
};

// Opens the Checkout modal for an order this app's backend already created,
// resolving with Razorpay's response once the user completes payment (or
// rejecting on dismiss/failure) — callers still need to POST that response
// to their own verify endpoint, this only drives the widget.
export const openRazorpayCheckout = async ({ orderId, amount, currency, keyId, name, description, prefill }) => {
  const Razorpay = await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      order_id: orderId,
      amount,
      currency,
      name: name || "ShareTruck",
      description,
      prefill,
      theme: { color: "#ff6a1a" },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    rzp.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
};
