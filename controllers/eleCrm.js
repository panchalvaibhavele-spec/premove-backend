// controllers/leadController.js

import { db } from "../db.js";

// =======================
// GET ALL LEADS
// =======================
export const getLeads = (req, res) => {
  const sql = `
    SELECT 
      id, lead_id, cust_name, cust_mobile, cust_email, city_name, moving_type, 
      lead_date, moving_date, leadfor, moving_from, moving_to 
    FROM ele_customer_lead 
    WHERE delete_status = 0
    ORDER BY id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("Lead Fetch Error:", err);
      return res.status(500).json({ success: false, message: "Server Error" });
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  });
};


// =======================
// GET SINGLE LEAD BY ID
// =======================
export const getLeadById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT * FROM ele_customer_lead 
    WHERE id = ? AND delete_status = 0
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log("Error:", err);
      return res.status(500).json({ success: false, message: "Server Error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Lead Not Found" });
    }

    return res.status(200).json({
      success: true,
      data: result[0],
    });
  });
};
