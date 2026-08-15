const axios = require("axios");

const geocodeAddress = async (address) => {
  const url = "https://nominatim.openstreetmap.org/search";

  const res = await axios.get(url, {
    params: {
      q: address,
      format: "json",
      limit: 1
    },
    headers: {
      "User-Agent": "ShareTruck (solutionsformonex@gmail.com)"
    }
  });

  if (!res.data.length) {
    throw new Error("Location not found");
  }

  return {
    lat: parseFloat(res.data[0].lat),
    lng: parseFloat(res.data[0].lon)
  };
};

module.exports = geocodeAddress;