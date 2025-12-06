import db from "../config/db.js";

// ✅ Save location (store in DB)
export const saveLocation = async (req, res) => {
  try {
    const { customerId, latitude, longitude } = req.body;

    if (!customerId || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Check if customer exists
    const [rows] = await db
      .promise()
      .query("SELECT id FROM ele_customer_lead WHERE id = ?", [customerId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    // Update lat/lng in customer lead table
    await db
      .promise()
      .query(
        `UPDATE ele_customer_lead 
         SET movingFromLat = ?, movingFromLng = ? 
         WHERE id = ?`,
        [latitude, longitude, customerId]
      );

    console.log("✅ Location saved:", { customerId, latitude, longitude });
    return res.json({
      success: true,
      message: "Location saved successfully",
      data: { customerId, latitude, longitude },
    });
  } catch (err) {
    console.error("❌ Error saving location:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Get location (from DB)
export const getLocation = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId)
      return res.status(400).json({ success: false, error: "Missing customerId" });

    const [rows] = await db
      .promise()
      .query(
        `SELECT id, cust_name, cust_mobile, movingFromLat AS latitude, movingFromLng AS longitude
         FROM ele_customer_lead
         WHERE id = ?`,
        [customerId]
      );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Location not found" });
    }

    const location = rows[0];
    return res.json({ success: true, location });
  } catch (err) {
    console.error("❌ Error fetching location:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
