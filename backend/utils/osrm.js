const axios = require("axios");

const getRoadDistance = async (origin, destination) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

    const res = await axios.get(url);

    if (!res.data.routes || res.data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = res.data.routes[0];

    return {
      distance: route.distance / 1000, // km
      duration: route.duration / 60    // minutes
    };

  } catch (error) {
    console.error("OSRM error:", error.message);
    return null;
  }
};

module.exports = getRoadDistance;