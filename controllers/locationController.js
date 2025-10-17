// controllers/locationController.js

// Dummy in-memory store (DB ke jagah)
let customerLocations = {};

export const saveLocation = (req, res) => {
  const { customerId, latitude, longitude } = req.body;
  if (!customerId || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  customerLocations[customerId] = { latitude, longitude, timestamp: Date.now() };
  console.log("customer", customerLocations)

  return res.json({ message: "Location saved", data: customerLocations[customerId] });
};

export const getLocation = (req, res) => {
  const { customerId } = req.params;
  const location = customerLocations[customerId];
  if (!location) {
    return res.status(404).json({ error: "Location not found" });
  }
  return res.json({ customerId, ...location });
};
