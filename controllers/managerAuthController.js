import db from "../config/db.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

const JWT_SECRET = "YOUR_SECRET_KEY";
let managerOtpStore = {}; // in-memory OTP store

// ✅ Send OTP
export const managerSendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.json({ success: false, error: "Missing phone" });

  try {
    // Fetch user by phone
    const [rows] = await db
      .promise()
      .query("SELECT * FROM ele_customer_manager WHERE phone_number = ?", [
        phone,
      ]);

    if (!rows.length)
      return res.json({ success: false, error: "User not found" });

    const user = rows[0];

    // Allow only manager or Head_Manager
    if (!["manager", "Head_Manager"].includes(user.user_role)) {
      return res.json({ success: false, error: "Role not allowed for OTP" });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`${user.user_role} OTP:`, otp);

    // Save OTP in memory separately per role
    managerOtpStore[`${phone}_${user.user_role}`] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 min expiry
    };

    // Save OTP in DB
    await db
      .promise()
      .query(
        "UPDATE ele_customer_manager SET temp_otp = ? WHERE phone_number = ?",
        [otp, phone]
      );

    // Send via WhatsApp API
    const msg = `Your OTP for manager login is ${otp}. Please do not share this code with anyone.`;
    const url = `http://whatsappapi.keepintouch.co.in/api/sendText?token=6103d1857f26a4cb49bbc8cc&phone=91${phone}&message=${encodeURIComponent(
      msg
    )}`;

    const response = await fetch(url);
    const text = await response.text();
    console.log("WhatsApp API response:", text);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Manager send OTP error:", err);
    res.json({ success: false, error: "Server error" });
  }
};

// ✅ Verify OTP
export const managerVerifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    // Fetch user by phone
    const [rows] = await db
      .promise()
      .query("SELECT * FROM ele_customer_manager WHERE phone_number = ?", [
        phone,
      ]);

    if (!rows.length)
      return res.json({ success: false, error: "User not found" });

    const user = rows[0];

    // Only manager or Head_Manager allowed
    if (!["manager", "Head_Manager"].includes(user.user_role)) {
      return res.json({ success: false, error: "Role not allowed" });
    }

    // Get OTP from memory (stored per role)
    const record = managerOtpStore[`${phone}_${user.user_role}`];
    if (!record) return res.json({ success: false, error: "OTP not found" });
    if (record.expires < Date.now())
      return res.json({ success: false, error: "OTP expired" });
    if (record.otp !== otp)
      return res.json({ success: false, error: "Invalid OTP" });

    // OTP verified, remove from memory
    delete managerOtpStore[`${phone}_${user.user_role}`];

    // Generate JWT with proper role
    const token = jwt.sign(
      { id: user.id, phone, role: user.user_role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Save token in DB
    await db
      .promise()
      .query(
        "UPDATE ele_customer_manager SET jwt_token = ?, jwt_expiry = ? WHERE phone_number = ?",
        [token, expiry, phone]
      );

    res.json({
      success: true,
      token,
      expiry,
      user: { id: user.id, name: user.name, role: user.user_role },
    });
  } catch (err) {
    console.error("❌ Manager verify OTP error:", err);
    res.json({ success: false, error: "Server error" });
  }
};

// ✅ Check JWT (Splash login)
export const managerCheckJwt = async (req, res) => {
  const { phone } = req.query;

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM ele_customer_manager WHERE phone_number = ?", [
        phone,
      ]);

    if (!rows.length) return res.json({ success: false });

    const manager = rows[0];
    if (!manager.jwt_token || Date.now() > manager.jwt_expiry)
      return res.json({ success: false });

    res.json({
      success: true,
      token: manager.jwt_token,
      expiry: manager.jwt_expiry,
      user: { id: manager.id, name: manager.name, type: "manager" },
    });
  } catch (err) {
    console.error("❌ Manager check JWT error:", err);
    res.json({ success: false });
  }
};

export const getCustomerInventory = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    if (!customerId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing customerId" });
    }

    const [inventory] = await db.promise().query(
      `
        SELECT inv.id,
               inv.sub_category_item_id,
               inv.quantity,
               inv.assemble_disamble,
               inv.wood_crafting,
               inv.wall_dismounting,
               inv.new_item,
               sci.sub_category_item_name AS item_name,
               sci.sub_category_item_image AS item_image,
               cl.home_type_id,
               cl.moving_to_floor_no,
               cl.moving_from_floor_no ,
               cl.spanco,
               ht.Home_size AS home_type_name
        FROM ele_customer_inventory inv
        LEFT JOIN ele_sub_category_item sci 
               ON inv.sub_category_item_id = sci.id
        INNER JOIN ele_customer_lead cl
               ON inv.lead_unique_id = cl.id
        LEFT JOIN home_type ht 
               ON cl.home_type_id = ht.id
        WHERE cl.id = ? OR cl.lead_id = ?
      `,
      [customerId, customerId]
    );

    res.json({ success: true, inventory });
  } catch (err) {
    console.error("❌ Error fetching customer inventory:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getCustomerDetails = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    if (!customerId)
      return res
        .status(400)
        .json({ success: false, error: "Missing customerId" });

    // Fetch customer details
    const [rows] = await db.promise().query(
      `SELECT cl.id,
          cl.cust_name,
          cl.cust_email,
          cl.cust_mobile,
          cl.moving_from,
          cl.moving_to,
          cl.moving_date,
          cl.moving_type,
          cl.ele_quotation_for_customer,
          cl.lead_date,
          cl.moving_from_floor_no,
          cl.moving_to_floor_no,
          cl.spanco,
          cl.created_date,
          ht.Home_size AS home_type_name
     FROM ele_customer_lead cl
     LEFT JOIN home_type ht
           ON cl.home_type_id = ht.id
     WHERE cl.id = ?`,
      [customerId]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });

    res.json({ success: true, customer: rows[0] });
  } catch (err) {
    console.error("❌ Error fetching customer details:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Fetch all registered customers with their matching leads
// export const getManagerCustomers = async (req, res) => {
//   try {
//     const managerId = req.user.id;
//     const [managerRow] = await db
//       .promise()
//       .query(`SELECT assign_location FROM ele_customer_manager WHERE id = ?`, [
//         managerId,
//       ]);

//     if (!managerRow.length) {
//       return res
//         .status(403)
//         .json({ success: false, error: "Manager not found" });
//     }

//     const assignLocation = managerRow[0].assign_location;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const offset = (page - 1) * limit;
//     const search = req.query.search ? `%${req.query.search}%` : null;

//     let where = "";
//     let params = [assignLocation];

//     if (search) {
//       where = `AND (l.cust_name LIKE ? OR l.cust_email LIKE ? OR l.cust_mobile LIKE ?)`;
//       params.push(search, search, search);
//     }

//     // Fetch unique customers from ele_customer_lead
//     const [customers] = await db.promise().query(
//       `
//       SELECT l.cust_mobile AS customer_mobile_no,
//              l.cust_name AS full_name,
//              l.cust_email AS customer_email,
//              COUNT(l.id) AS total_leads
//       FROM ele_customer_lead l
//       WHERE l.city_name = ?
//       ${where}
//       GROUP BY l.cust_mobile
//       ORDER BY l.cust_name
//       LIMIT ? OFFSET ?
//       `,
//       [...params, limit, offset]
//     );

//     // Total unique customers count
//     const [[{ total }]] = await db.promise().query(
//       `
//       SELECT COUNT(DISTINCT l.cust_mobile) AS total
//       FROM ele_customer_lead l
//       WHERE l.city_name = ?
//       ${where}
//       `,
//       params
//     );

//     res.json({ success: true, customers, total, page, limit });
//   } catch (err) {
//     console.error("❌ Error fetching manager customers:", err);
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// };
export const getManagerCustomers = async (req, res) => {
  try {
    const managerId = req.user.id;

    const [managerRow] = await db
      .promise()
      .query(
        `SELECT assign_location, user_role FROM ele_customer_manager WHERE id = ?`,
        [managerId]
      );

    if (!managerRow.length) {
      return res
        .status(403)
        .json({ success: false, error: "Manager not found" });
    }

    const { assign_location: assignLocation, user_role: role } = managerRow[0];

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let where = "";
    let params = [];

    if (role !== "Head_Manager") {
      where += "WHERE l.city_name = ?";
      params.push(assignLocation);
    } else {
      where += "WHERE 1";
    }

    if (search) {
      where += ` AND (l.cust_name LIKE ? OR l.cust_email LIKE ? OR l.cust_mobile LIKE ?)`;
      params.push(search, search, search);
    }

    // ✅ Fixed query: wrap non-aggregated columns in MAX()
    const [customers] = await db.promise().query(
      `
      SELECT l.cust_mobile AS customer_mobile_no,
             MAX(l.cust_name) AS full_name,
             MAX(l.cust_email) AS customer_email,
             COUNT(l.id) AS total_leads
      FROM ele_customer_lead l
      ${where}
      GROUP BY l.cust_mobile
      ORDER BY MAX(l.cust_name)
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.promise().query(
      `
      SELECT COUNT(DISTINCT l.cust_mobile) AS total
      FROM ele_customer_lead l
      ${where}
      `,
      params
    );

    res.json({ success: true, customers, total, page, limit });
  } catch (err) {
    console.error("❌ Error fetching manager customers:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Fetch leads for a specific customer mobile number
// export const getCustomerLeads = async (req, res) => {
//   try {
//     const { mobile } = req.params;
//     const { userType, userId } = req.query;
//     const managerId = req.user?.id; // middleware se aayega

//     if (!mobile) {
//       return res.status(400).json({ success: false, error: "Mobile required" });
//     }

//     let query = `
//       SELECT l.id, l.cust_name, l.cust_email, l.cust_mobile, l.city_name,
//              l.moving_from, l.moving_to, l.moving_date, l.moving_type,
//              l.ele_quotation_for_customer, l.lead_date, l.created_date,
//              COUNT(i.id) AS inventory_count
//       FROM ele_customer_lead l
//       LEFT JOIN ele_customer_inventory i
//         ON i.lead_unique_id = l.id AND i.deleted_inventory = 0
//     `;

//     let params = [];

//     if (userType === "manager" || req.user?.role === "manager") {
//       const finalManagerId = userId || managerId;

//       query += `
//         WHERE l.cust_mobile = ?
//           AND EXISTS (
//             SELECT 1
//             FROM ele_customer_manager m
//             WHERE m.id = ?
//               AND m.assign_location = l.city_name
//           )
//       `;
//       params.push(mobile, finalManagerId);
//     } else {
//       query += ` WHERE l.cust_mobile = ? `;
//       params.push(mobile);
//     }

//     query += `
//       GROUP BY l.id
//       ORDER BY l.lead_date DESC
//     `;

//     const [leads] = await db.promise().query(query, params);

//     res.json({ success: true, leads });
//   } catch (err) {
//     console.error("❌ Error fetching leads:", err);
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// };
export const getCustomerLeads = async (req, res) => {
  try {
    const { mobile } = req.params;
    const { userType, userId } = req.query;
    const managerId = req.user?.id; // from middleware
    const role = req.user?.role; // fetch role from JWT

    if (!mobile) {
      return res.status(400).json({ success: false, error: "Mobile required" });
    }

    let query = `
      SELECT l.id,
             MAX(l.cust_name) AS cust_name,
             MAX(l.cust_email) AS cust_email,
             MAX(l.cust_mobile) AS cust_mobile,
             MAX(l.city_name) AS city_name,
             MAX(l.moving_from) AS moving_from,
             MAX(l.moving_to) AS moving_to,
             MAX(l.moving_date) AS moving_date,
             MAX(l.moving_type) AS moving_type,
             MAX(l.ele_quotation_for_customer) AS ele_quotation_for_customer,
             MAX(l.lead_date) AS lead_date,
             MAX(l.created_date) AS created_date,
             COUNT(i.id) AS inventory_count
      FROM ele_customer_lead l
      LEFT JOIN ele_customer_inventory i 
        ON i.lead_unique_id = l.id AND i.deleted_inventory = 0
    `;

    let params = [];

    if (role === "manager") {
      const finalManagerId = userId || managerId;
      query += `
        WHERE l.cust_mobile = ?
          AND EXISTS (
            SELECT 1
            FROM ele_customer_manager m
            WHERE m.id = ?
              AND m.assign_location = l.city_name
          )
      `;
      params.push(mobile, finalManagerId);
    } else {
      // Head_Manager or fallback
      query += ` WHERE l.cust_mobile = ? `;
      params.push(mobile);
    }

    query += `
      GROUP BY l.id
      ORDER BY MAX(l.lead_date) DESC
    `;

    const [leads] = await db.promise().query(query, params);

    res.json({ success: true, leads });
  } catch (err) {
    console.error("❌ Error fetching leads:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Fetch inventory of a lead with item details
export const getLeadInventory = async (req, res) => {
  try {
    const { leadId } = req.params;
    console.log("leadID", req.params.leadId);

    // 1) Lead info निकालना
    const [leadRows] = await db.promise().query(
      `SELECT id, cust_name, cust_email, cust_mobile, city_name, moving_from,
              moving_to, moving_date, moving_type, ele_quotation_for_customer, lead_date, created_date
       FROM ele_customer_lead
       WHERE id = ? AND delete_status = 0`,
      [leadId]
    );

    const lead = leadRows.length > 0 ? leadRows[0] : null;

    // 2) Inventory निकालना
    const [inventory] = await db.promise().query(
      `SELECT i.id, i.quantity, i.assemble_disamble, i.wood_crafting, i.wall_dismounting,
              s.sub_category_item_name, s.sub_category_item_image
       FROM ele_customer_inventory i
       INNER JOIN ele_sub_category_item s ON s.id = i.sub_category_item_id
       WHERE i.lead_unique_id = ? AND i.deleted_inventory = 0`,
      [leadId]
    );

    // Final response
    res.json({ success: true, lead, inventory });
  } catch (err) {
    console.error("❌ Error fetching inventory:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const authMiddleware = (req, res, next) => {
  console.log("---- AUTH MIDDLEWARE START ----");
  console.log("Raw headers:", req.headers);
  console.log("Incoming Auth header:", req.headers.authorization);

  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader) {
    console.log("❌ No Authorization header found");
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  console.log("Extracted token:", token);

  if (!token) {
    console.log("❌ No token part after 'Bearer'");
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ JWT verified. Decoded payload:", decoded);

    req.user = decoded; // { id, phone, role }
    console.log("---- AUTH MIDDLEWARE PASSED ----");
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ✅ Fetch customers by spanco
export const getDashboardCustomersBySpanco = async (req, res) => {
  try {
    const { spanco, date_from, date_to } = req.query;

    let query = `
      SELECT id, cust_name, cust_email, cust_mobile, city_name, moving_from,
             moving_to, moving_date, moving_type, ele_quotation_for_customer, lead_date, created_date
      FROM ele_customer_lead
      WHERE delete_status = 0
    `;

    const params = [];

    // Apply spanco filter only if provided
    if (spanco) {
      query += ` AND spanco = ? `;
      params.push(spanco);
    }

    if (date_from && date_to) {
      query += ` AND DATE(created_date) BETWEEN ? AND ? `;
      params.push(date_from, date_to);
    } else {
      query += ` AND DATE(created_date) = CURDATE() `;
    }

    query += ` ORDER BY created_date DESC LIMIT 50`;

    const [customers] = await db.promise().query(query, params);

    res.json({ success: true, customers });
  } catch (err) {
    console.error("❌ Error fetching customers by spanco:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getMangerDetails = async (req, res) => {
  try {
    const managerPhone = req.params.phone;
    if (!managerPhone)
      return res
        .status(400)
        .json({ success: false, error: "Missing manager phone number" });
    console.log("Manager Phone:", managerPhone);

    const [managerDetails] = await db
      .promise()
      .query(
        "SELECT name, email,user_role,assign_location,phone_number  FROM ele_customer_manager WHERE phone_number = ?",
        [managerPhone]
      );

    if (!managerDetails) {
      return res
        .status(404)
        .json({ success: false, error: "Manager not found" });
    }

    res.json({ success: true, manager: managerDetails });
  } catch (err) {
    console.error("❌ Error fetching manager details:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const updateManagerDetails = async (req, res) => {
  try {
    const managerPhone = req.params.phone;
    console.log("managerPhone:", managerPhone);
    const { name, email } = req.body;
    if (!managerPhone)
      return res
        .status(400)
        .json({ success: false, error: "Missing manager phone number" });
    console.log("Manager Phone:", managerPhone);
    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, error: "Name and email are required" });
    }
    const [result] = await db
      .promise()
      .query(
        "UPDATE ele_customer_manager SET name = ?, email = ? WHERE phone_number = ?",
        [name, email, managerPhone]
      );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Manager not found" });
    }
    res.json({
      success: true,
      message: "Manager details updated successfully",
    });
  } catch (err) {
    console.error("❌ Error updating manager details:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getCustomerLocation = async (req, res) => {
  try {
    const customerId = req.params.id; // dynamic ID
    console.log("customer idfrm backend", customerId);

    // ✅ Fetch movingFrom lat/long from ele_customer_lead
    const [rows] = await db.promise().query(
      `SELECT id, cust_name, cust_mobile, cust_email,
              moving_from, moving_to, city_name,
              movingFromLat AS movingFromLat,
              movingFromLng AS movingFromLog
       FROM ele_customer_lead
       WHERE id = ?`,
      [customerId]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const customer = rows[0];

    // ✅ Return lat/lng safely
    return res.json({
      success: true,
      customerId: customer.id,
      name: customer.cust_name,
      email: customer.cust_email,
      mobile: customer.cust_mobile,
      movingFrom: customer.moving_from,
      movingTo: customer.moving_to,
      city: customer.city_name,
      movingFromLat: customer.movingFromLat,
      movingFromLog: customer.movingFromLog,
    });
  } catch (err) {
    console.error("Error fetching customer location:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Fetch visit requests
// export const getVisitRequests = async (req, res) => {
//   try {
//     const { managerId } = req.query;
//     console.log("manager id", managerId);
//     if (!managerId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "managerId is required" });
//     }

//     const [managerRows] = await db
//       .promise()
//       .query(
//         "SELECT assign_location, user_role FROM ele_customer_manager WHERE id = ?",
//         [managerId]
//       );

//     if (!managerRows.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Manager not found" });
//     }

//     const { assign_location: assignLocation, user_role: role } = managerRows[0];

//     let query = `
//       SELECT vr.id AS visit_id,
//              vr.schedule_date,
//              vr.time_from,
//              vr.time_to,
//              vr.status,
//              c.id AS lead_id,
//              MAX(c.cust_name) AS cust_name,
//              MAX(c.cust_email) AS cust_email,
//              MAX(c.cust_mobile) AS cust_mobile,
//              MAX(c.moving_from) AS moving_from,
//              MAX(c.moving_to) AS moving_to,
//              MAX(c.city_name) AS city_name,
//              MAX(c.state_name) AS state_name,
//              MAX(c.moving_type) AS moving_type,
//              COUNT(inv.id) AS inventory_count
//       FROM customer_visite_request vr
//       JOIN ele_customer_lead c ON c.id = vr.lead_id
//       LEFT JOIN ele_customer_inventory inv ON inv.lead_unique_id = c.id
//     `;

//     const params = [];

//     if (role !== "Head_Manager") {
//       query += ` WHERE c.city_name = ? `;
//       params.push(assignLocation);
//     }

//     query += `
//       GROUP BY vr.id, c.id
//       ORDER BY vr.created_at DESC
//     `;

//     const [requests] = await db.promise().query(query, params);

//     return res.json({ success: true, requests });
//   } catch (err) {
//     console.error("Error fetching visit requests:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
export const getVisitRequests = async (req, res) => {
  try {
    const { managerId } = req.query;
    console.log("manager id", managerId);
    if (!managerId) {
      return res
        .status(400)
        .json({ success: false, message: "managerId is required" });
    }

    const [managerRows] = await db
      .promise()
      .query(
        "SELECT assign_location, user_role FROM ele_customer_manager WHERE id = ?",
        [managerId]
      );

    if (!managerRows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Manager not found" });
    }

    const { assign_location: assignLocation, user_role: role } = managerRows[0];

    let query = `
      SELECT vr.id AS visit_id,
             vr.schedule_date,
             vr.time_from,
             vr.time_to,
             vr.status,
             c.id AS lead_id,
             MAX(c.cust_name) AS cust_name,
             MAX(c.cust_email) AS cust_email,
             MAX(c.cust_mobile) AS cust_mobile,
             MAX(c.moving_from) AS moving_from,
             MAX(c.moving_to) AS moving_to,
             MAX(c.city_name) AS city_name,
             MAX(c.state_name) AS state_name,
             MAX(c.moving_type) AS moving_type,
             COUNT(inv.id) AS inventory_count
      FROM customer_visite_request vr
      JOIN ele_customer_lead c ON c.id = vr.lead_id
      LEFT JOIN ele_customer_inventory inv ON inv.lead_unique_id = c.id AND inv.deleted_inventory = 0
    `;

    const params = [];

    if (role !== "Head_Manager") {
      query += ` WHERE c.city_name = ? `;
      params.push(assignLocation);
    }

    query += `
      GROUP BY vr.id, c.id
      ORDER BY vr.created_at DESC
    `;

    const [requests] = await db.promise().query(query, params);

    return res.json({ success: true, requests });
  } catch (err) {
    console.error("Error fetching visit requests:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Fetch today's visit requests
// export const getTodayVisitRequests = async (req, res) => {
//   try {
//     const { managerId } = req.query;
//     console.log("manager id", managerId);

//     if (!managerId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "managerId is required" });
//     }

//     const [managerRows] = await db
//       .promise()
//       .query(
//         "SELECT assign_location, user_role FROM ele_customer_manager WHERE id = ?",
//         [managerId]
//       );

//     if (!managerRows.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Manager not found" });
//     }

//     const { assign_location: assignLocation, user_role: role } = managerRows[0];

//     const today = new Date().toISOString().split("T")[0];

//     let query = `
//       SELECT vr.id AS visit_id,
//              vr.schedule_date,
//              vr.time_from,
//              vr.time_to,
//              vr.status,
//              c.id AS lead_id,
//              MAX(c.cust_name) AS cust_name,
//              MAX(c.cust_email) AS cust_email,
//              MAX(c.cust_mobile) AS cust_mobile,
//              MAX(c.moving_from) AS moving_from,
//              MAX(c.moving_to) AS moving_to,
//              MAX(c.city_name) AS city_name,
//              MAX(c.state_name) AS state_name,
//              MAX(c.moving_type) AS moving_type,
//              COUNT(inv.id) AS inventory_count
//       FROM customer_visite_request vr
//       JOIN ele_customer_lead c ON c.id = vr.lead_id
//       LEFT JOIN ele_customer_inventory inv ON inv.lead_unique_id = c.id
//       WHERE DATE(vr.created_at) = ? 
//         AND (vr.status = 'pending' OR vr.status = 'started')
//     `;

//     const params = [today];

//     if (role !== "Head_Manager") {
//       query += ` AND c.city_name = ? `;
//       params.push(assignLocation);
//     }

//     query += `
//       GROUP BY vr.id, c.id
//       ORDER BY vr.created_at DESC
//     `;

//     const [requests] = await db.promise().query(query, params);

//     return res.json({
//       success: true,
//       date: today,
//       count: requests.length,
//       requests,
//     });
//   } catch (err) {
//     console.error("Error fetching today's visit requests:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
export const getTodayVisitRequests = async (req, res) => {
  try {
    const { managerId } = req.query;
    console.log("manager id", managerId);

    if (!managerId) {
      return res
        .status(400)
        .json({ success: false, message: "managerId is required" });
    }

    const [managerRows] = await db
      .promise()
      .query(
        "SELECT assign_location, user_role FROM ele_customer_manager WHERE id = ?",
        [managerId]
      );

    if (!managerRows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Manager not found" });
    }

    const { assign_location: assignLocation, user_role: role } = managerRows[0];

    const today = new Date().toISOString().split("T")[0];

    let query = `
      SELECT vr.id AS visit_id,
             vr.schedule_date,
             vr.time_from,
             vr.time_to,
             vr.status,
             c.id AS lead_id,
             MAX(c.cust_name) AS cust_name,
             MAX(c.cust_email) AS cust_email,
             MAX(c.cust_mobile) AS cust_mobile,
             MAX(c.moving_from) AS moving_from,
             MAX(c.moving_to) AS moving_to,
             MAX(c.city_name) AS city_name,
             MAX(c.state_name) AS state_name,
             MAX(c.moving_type) AS moving_type,
             COUNT(inv.id) AS inventory_count
      FROM customer_visite_request vr
      JOIN ele_customer_lead c ON c.id = vr.lead_id
      LEFT JOIN ele_customer_inventory inv ON inv.lead_unique_id = c.id AND inv.deleted_inventory = 0
      WHERE DATE(vr.created_at) = ? 
        AND (vr.status = 'pending' OR vr.status = 'started')
    `;

    const params = [today];

    if (role !== "Head_Manager") {
      query += ` AND c.city_name = ? `;
      params.push(assignLocation);
    }

    query += `
      GROUP BY vr.id, c.id
      ORDER BY vr.created_at DESC
    `;

    const [requests] = await db.promise().query(query, params);

    return res.json({
      success: true,
      date: today,
      count: requests.length,
      requests,
    });
  } catch (err) {
    console.error("Error fetching today's visit requests:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Send Visit OTP
export const sendVisitOtp = async (req, res) => {
  const { customerId } = req.body;
  console.log("customer id for visit", customerId);
  if (!customerId) {
    return res.json({ success: false, error: "Missing customerId" });
  }

  try {
    // 1️⃣ Get lead from ele_customer_lead
    const [leadRows] = await db
      .promise()
      .query("SELECT id, cust_mobile FROM ele_customer_lead WHERE id = ?", [
        customerId,
      ]);

    if (!leadRows.length) {
      return res.json({ success: false, error: "Customer not found" });
    }

    const leadId = leadRows[0].id;
    const customerMobile = leadRows[0].cust_mobile;

    // 2️⃣ Check visit request for this lead
    const [visitRows] = await db
      .promise()
      .query("SELECT id FROM customer_visite_request WHERE lead_id = ?", [
        leadId,
      ]);

    if (!visitRows.length) {
      return res.json({ success: false, error: "Visit request not found" });
    }

    const visitId = visitRows[0].id;

    // 3️⃣ Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Generated OTP:", otp);

    // 4️⃣ Save OTP in visit request
    await db
      .promise()
      .query(
        "UPDATE customer_visite_request SET otp_code = ?, status='arrived' WHERE id = ?",
        [otp, visitId]
      );

    // 5️⃣ Send WhatsApp OTP
    const msg = `Your visit verification OTP is ${otp}. Please do not share this code with anyone.`;

    const url = `http://whatsappapi.keepintouch.co.in/api/sendText?token=6103d1857f26a4cb49bbc8cc&phone=91${customerMobile}&message=${encodeURIComponent(
      msg
    )}`;
    await fetch(url);

    res.json({ success: true, message: "OTP sent to customer" });
  } catch (err) {
    console.error("Send visit OTP error:", err);
    res.json({ success: false, error: "Server error" });
  }
};

// ✅ Verify Visit OTP
export const verifyVisitOtp = async (req, res) => {
  const { customerId, otp } = req.body;

  if (!customerId || !otp) {
    return res.json({ success: false, error: "Missing customerId or OTP" });
  }

  try {
    // 1️⃣ Get visit request using customerId -> lead_id
    const [visitRows] = await db
      .promise()
      .query(
        "SELECT id, otp_code FROM customer_visite_request WHERE lead_id = ?",
        [customerId]
      );

    if (!visitRows.length) {
      return res.json({ success: false, error: "Visit not found" });
    }

    const visitId = visitRows[0].id;
    const dbOtp = visitRows[0].otp_code;

    console.log("DB OTP:", dbOtp, "User OTP:", otp);

    // 2️⃣ Compare as number
    if (Number(dbOtp) !== Number(otp)) {
      return res.json({ success: false, error: "Invalid OTP" });
    }

    // 3️⃣ OTP correct → update status
    await db
      .promise()
      .query(
        "UPDATE customer_visite_request SET status='completed', otp_code=NULL WHERE id = ?",
        [visitId]
      );

    res.json({ success: true, message: "Visit completed successfully" });
  } catch (err) {
    console.error("Verify visit OTP error:", err);
    res.json({ success: false, error: "Server error" });
  }
};

// ✅ Get Manager Location
export const getManagerLocation = async (req, res) => {
  const { managerId } = req.params;
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT latitude, longitude FROM ele_customer_manager WHERE id = ?",
        [managerId]
      );

    if (!rows.length) {
      return res.json({ success: false, error: "Manager not found" });
    }

    res.json({
      success: true,
      latitude: rows[0].latitude,
      longitude: rows[0].longitude,
    });
  } catch (err) {
    console.error("Get manager location error:", err);
    res.json({ success: false, error: "Server error" });
  }
};

// ✅ Create Visit Request
export const createVisitRequest = async (req, res) => {
  const { customerId, managerId } = req.body;

  if (!customerId || !managerId) {
    return res.json({
      success: false,
      error: "Missing customerId or managerId",
    });
  }

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM customer_visite_request WHERE lead_id = ?", [
        customerId,
      ]);

    if (rows.length === 0) {
      return res.json({
        success: false,
        error: "No visit request found for this customerId",
      });
    }

    // 🔥 check status
    const visit = rows[0];
    if (visit.status === "completed") {
      return res.json({
        success: false,
        error: "Inspection already completed for this customer",
      });
    }

    // ✅ Update manager_id if pending
    await db
      .promise()
      .query(
        "UPDATE customer_visite_request SET manager_id = ?, status = 'pending' WHERE lead_id = ?",
        [managerId, customerId]
      );

    res.json({
      success: true,
      message: "Manager assigned to visit request successfully",
    });
  } catch (err) {
    console.error("Create visit request error:", err);
    res.json({ success: false, error: "Server error" });
  }
};

// ✅ Start Visit Request
export const startVisitRequest = async (req, res) => {
  const { customerId } = req.body;
  try {
    await db
      .promise()
      .query(
        "UPDATE customer_visite_request SET status = 'started' WHERE lead_id = ?",
        [customerId]
      );
    res.json({ success: true, message: "Visit started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Update Manager Location
export const updateManagerLocation = async (req, res) => {
  const { managerId, latitude, longitude } = req.body;
  console.log(
    "manageriasfdsdad",
    managerId,
    ";",
    "lat",
    latitude,
    "lat",
    longitude
  );
  if (!managerId || !latitude || !longitude) {
    return res.json({
      success: false,
      error: "Missing managerId or coordinates",
    });
  }

  try {
    await db
      .promise()
      .query(
        "UPDATE ele_customer_manager SET latitude = ?, longitude = ? WHERE id = ?",
        [latitude, longitude, managerId]
      );

    res.json({ success: true, message: "Location updated successfully" });
  } catch (err) {
    console.error("Update manager location error:", err);
    res.json({ success: false, error: "Server error" });
  }
};
