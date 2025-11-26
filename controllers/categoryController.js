import { api } from "../config/baseurl.js";
import db from "../config/db.js"; // 👈 fixed path
import axios from "axios"; // <--- ADD THIS
import multer from "multer";

// ✅ Get single lead by ID
// export const getLeadById = async (req, res) => {
//   const id = req.params.id;

//   db.query(
//     "SELECT * FROM ele_customer_lead WHERE id = ?",
//     [id],
//     (err, leads) => {
//       if (err) return res.status(500).json({ error: "DB error" });

//       res.json({
//         success: true,
//         total: leads.length,
//         leads,
//       });
//     }
//   );
// };// ✅ Get single lead by ID with Home Size join
export const getLeadById = async (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT 
      l.*,
      h.Home_size AS home_size_text
    FROM 
      ele_customer_lead l
    LEFT JOIN 
      home_type h 
    ON 
      l.home_type_id = h.id
    WHERE 
      l.id = ?
  `;

  db.query(sql, [id], (err, leads) => {
    if (err) {
      console.error("❌ DB Error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    res.json({
      success: true,
      total: leads.length,
      leads,
    });
  });
};

export const getAllItems = (req, res) => {
  db.query(
    "SELECT id, sub_category_item_name, sub_category_item_image FROM ele_sub_category_item",
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching all items:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
};

export const getInventoryByLead = (req, res) => {
  const leadId = req.params.lead_unique_id;
  console.log(leadId);

  console.log("📌 Requested Lead ID:", leadId);

  db.query(
    `SELECT id, sub_category_item_id, quantity, cust_email 
     FROM ele_customer_inventory 
     WHERE lead_unique_id = ? AND deleted_inventory = 0`,
    [leadId],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching inventory:", err);
        return res.status(500).json({ error: "Database error" });
      }
      console.log("✅ Inventory results:", results);
      res.json(results);
    }
  );
};

// Get sub-category item by ID
export const getSubCategoryItemInventory = (req, res) => {
  const id = req.params.id;
  console.log(id);

  db.query(
    `SELECT id, sub_category_item_name, sub_category_item_image, sub_category_id, cubic_feet, assemble_disamble, wood_crafting, wall_dismounting
     FROM ele_sub_category_item WHERE id = ?`,
    [id],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching sub category item:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results || []);
    }
  );
};
export const getSubCategoryItem = (req, res) => {
  const id = req.params.id;
  console.log(id);

  db.query(
    `SELECT id, sub_category_item_name, sub_category_item_image, sub_category_id, cubic_feet, assemble_disamble, wood_crafting, wall_dismounting
     FROM ele_sub_category_item WHERE sub_category_id = ?`,
    [id],
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching sub category item:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results || []);
    }
  );
};

export const getCustomerLeads = (req, res) => {
  const phone = req.params.phone;

  const sql = `
    SELECT l.*, 
           COUNT(ci.id) AS inventory
    FROM ele_customer_lead l
    LEFT JOIN ele_customer_inventory ci 
      ON l.id = ci.lead_unique_id 
      AND ci.deleted_inventory = 0
    WHERE l.cust_mobile = ?
    GROUP BY l.id
    ORDER BY l.id DESC
  `;

  db.query(sql, [phone], (err, leads) => {
    if (err) {
      console.error("❌ DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    res.json({
      success: true,
      total: leads.length,
      leads,
    });
  });
};

export const getCustomerInventory = (req, res) => {
  const leadId = req.params.leadId;

  const sql = `
    SELECT 
      ci.id,
      ci.sub_category_item_id,
      ci.quantity,
      ci.assemble_disamble,
      ci.wood_crafting,
      ci.wall_dismounting,
      ci.lead_unique_id,
      ci.cust_email,
      ci.new_item,
      si.sub_category_item_name,
      si.sub_category_item_image,
      si.cubic_feet,
      v.id AS video_id,
      v.video_path,
      v.uploaded_at
    FROM ele_customer_inventory ci
    JOIN ele_sub_category_item si 
      ON ci.sub_category_item_id = si.id
    LEFT JOIN ele_customer_videos v 
      ON v.lead_id = ci.lead_unique_id   -- ⚡ match video table with lead
    WHERE ci.lead_unique_id = ? 
      AND ci.deleted_inventory = 0
  `;

  db.query(sql, [leadId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching customer inventory:", err);
      return res.status(500).json({ error: "Database error" });
    }
    const baseServerUrl = api.defaults.baseURL.replace("/api/", "/");

    const inventory = results.map((item) => ({
      ...item,
      sub_category_item_image: item.sub_category_item_image
        ? `https://res.cloudinary.com/dfqledkbu/image/upload/v1757054818/premove_inventory/${item.sub_category_item_image}`
        : null,
      video_url: item.video_path
        ? `${baseServerUrl}/${item.video_path}` // ya api.defaults.baseURL.replace('/api','')
        : null,
    }));

    res.json(inventory);
  });
};

// ✅ POST /api/add-inventory
export const addInventory = (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No items provided" });
  }

  let inserted = 0;
  let processed = 0;
  let errors = [];

  items.forEach((item) => {
    if (item.quantity > 0 && item.lead_unique_id) {
      db.query(
        `INSERT INTO ele_customer_inventory (sub_category_item_id, quantity, lead_unique_id, cust_email)
         VALUES (?, ?, ?, ?)`,
        [
          item.sub_category_item_id,
          item.quantity,
          item.lead_unique_id,
          item.cust_email || "",
        ],
        (err) => {
          processed++;
          if (err) errors.push({ item, error: err.message });
          else inserted++;

          if (processed === items.length) {
            if (errors.length)
              return res.status(500).json({ success: false, inserted, errors });
            return res.json({
              success: true,
              message: "Inventory added successfully",
              inserted,
            });
          }
        }
      );
    } else {
      processed++;
      if (processed === items.length) {
        if (errors.length)
          return res.status(500).json({ success: false, inserted, errors });
        return res.json({
          success: true,
          message: "Inventory added successfully",
          inserted,
        });
      }
    }
  });
};

// ✅ POST /api/create-lead
// export const createLead = (req, res) => {
//   const {
//     cust_name,
//     cust_email,
//     cust_mobile,
//     moving_type,
//     moving_from,
//     moving_to,
//     moving_date,
//     home_type_id,
//   } = req.body;

//   if (!cust_name || !cust_mobile) {
//     return res.status(400).json({
//       success: false,
//       message: "Customer name and mobile are required",
//     });
//   }

//   const sql = `
//     INSERT INTO ele_customer_lead
//       (cust_name, cust_email, cust_mobile, moving_type, moving_from, moving_to, moving_date, home_type_id, lead_date, lead_generate_from)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)
//   `;

//   db.query(
//     sql,
//     [
//       cust_name || null,
//       cust_email || null,
//       cust_mobile || null,
//       moving_type || null,
//       moving_from || null,
//       moving_to || null,
//       moving_date || null,
//       home_type_id || null,
//     ],
//     (err, result) => {
//       if (err)
//         return res
//           .status(500)
//           .json({ success: false, message: "DB insert failed" });

//       // Return the generated lead id
//       return res.status(201).json({
//         success: true,
//         message: "Lead created successfully",
//         lead_id: result.insertId,
//       });
//     }
//   );
// };
// export const saveInventory = async (req, res) => {
//   try {
//     const { items, lead_unique_id, cust_email } = req.body;

//     if (!items || items.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No items provided" });
//     }

//     const queries = items.map((it) => {
//       return new Promise((resolve, reject) => {
//         db.query(
//           `INSERT INTO ele_customer_inventory
//            (sub_category_item_id, quantity, assemble_disamble, wood_crafting, wall_dismounting, lead_unique_id, cust_email)
//            VALUES (?, ?, ?, ?, ?, ?, ?)`,
//           [
//             it.sub_category_item_id,
//             it.quantity,
//             it.assemble_disamble,
//             it.wood_crafting,
//             it.wall_dismounting,
//             lead_unique_id,
//             cust_email || "default@email.com",
//           ],
//           (err) => {
//             if (err) reject(err);
//             else resolve();
//           }
//         );
//       });
//     });

//     await Promise.all(queries);

//     res.json({ success: true, message: "Inventory saved successfully" });
//   } catch (err) {
//     console.error("❌ saveInventory error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// };

// export const saveInventory = async (req, res) => {
//   try {
//     const { items, lead_unique_id, cust_email } = req.body;

//     console.log("lead_unique_id",lead_unique_id)
//     if (!items || items.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No items provided" });
//     }

//     // 🔹 Step 1: Save all inventory items
//     const queries = items.map((it) => {
//       return new Promise((resolve, reject) => {
//         db.query(
//           `INSERT INTO ele_customer_inventory
//            (sub_category_item_id, quantity, assemble_disamble, wood_crafting, wall_dismounting, lead_unique_id, cust_email,new_item)
//            VALUES (?, ?, ?, ?, ?, ?, ?,1)`,
//           [
//             it.sub_category_item_id,
//             it.quantity,
//             it.assemble_disamble,
//             it.wood_crafting,
//             it.wall_dismounting,
//             lead_unique_id,
//             cust_email || "default@email.com",
//           ],
//           (err) => {
//             if (err) reject(err);
//             else resolve();
//           }
//         );
//       });
//     });

//     await Promise.all(queries);

//     // 🔹 Step 2: Update spanco to 'p' in ele_customer_lead
//     await new Promise((resolve, reject) => {
//       db.query(
//         `UPDATE ele_customer_lead
//          SET spanco = 'p'
//          WHERE id = ?`,
//         [lead_unique_id],
//         (err) => {
//           if (err) reject(err);
//           else resolve();
//         }
//       );
//     });

//     // 🔹 Final Response
//     res.json({
//       success: true,
//       message: "Inventory saved successfully and lead updated to 'p'",
//     });
//   } catch (err) {
//     console.error("❌ saveInventory error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// };

// export const saveInventory = async (req, res) => {
//   try {
//     const { items, lead_unique_id, cust_email, user_type } = req.body;

//     if (!items || items.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No items provided" });
//     }

//     // Decide new_item based on role
//     const newItemValue = user_type === "manager" ||user_type === "Head_Manager" ? 1 : 0;

//     // 🔹 Save inventory items
//     const queries = items.map((it) => {
//       return new Promise((resolve, reject) => {
//         db.query(
//           `INSERT INTO ele_customer_inventory
//            (sub_category_item_id, quantity, assemble_disamble, wood_crafting, wall_dismounting, lead_unique_id, cust_email, new_item)
//            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             it.sub_category_item_id,
//             it.quantity,
//             it.assemble_disamble,
//             it.wood_crafting,
//             it.wall_dismounting,
//             lead_unique_id,
//             cust_email || "default@email.com",
//             newItemValue, // 👈 role based value
//           ],
//           (err) => {
//             if (err) reject(err);
//             else resolve();
//           }
//         );
//       });
//     });

//     await Promise.all(queries);

//     // 🔹 Update lead spanco
//     await new Promise((resolve, reject) => {
//       db.query(
//         `UPDATE ele_customer_lead SET spanco = 'p' WHERE id = ?`,
//         [lead_unique_id],
//         (err) => (err ? reject(err) : resolve())
//       );
//     });

//     res.json({
//       success: true,
//       message: `Inventory saved successfully (${user_type})`,
//     });
//   } catch (err) {
//     console.error("❌ saveInventory error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// };

export const saveInventory = async (req, res) => {
  try {
    const { items, lead_unique_id, cust_email, user_type } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided" });
    }

    // 🔹 Role-based new_item value
    const newItemValue =
      user_type === "manager" || user_type === "Head_Manager" ? 1 : 0;

    // 🔹 Save inventory items
    const queries = items.map((it) => {
      return new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO ele_customer_inventory 
           (sub_category_item_id, quantity, assemble_disamble, wood_crafting, wall_dismounting, lead_unique_id, cust_email, new_item) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            it.sub_category_item_id,
            it.quantity,
            it.assemble_disamble,
            it.wood_crafting,
            it.wall_dismounting,
            lead_unique_id,
            cust_email || "default@email.com",
            newItemValue,
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    await Promise.all(queries);

    // 🔹 Only update spanco if added by CUSTOMER
    if (user_type === "customer") {
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE ele_customer_lead SET spanco = 'p' WHERE id = ?`,
          [lead_unique_id],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    res.json({
      success: true,
      message: `Inventory saved successfully (${user_type})`,
    });
  } catch (err) {
    console.error("❌ saveInventory error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

export const getHomeTypes = (req, res) => {
  db.query("SELECT id, Home_size FROM home_type", (err, results) => {
    if (err) {
      console.error("❌ Error fetching home types:", err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    res.json({ success: true, data: results });
  });
};
// export const createLead = (req, res) => {
//   const {
//     cust_name,
//     cust_email,
//     cust_mobile,
//     moving_type,
//     moving_from,
//     moving_to,
//     moving_date,
//     home_type_id,
//     city_name,
//     // state_name,
//   } = req.body;

//   if (!cust_name || !cust_mobile) {
//     return res.status(400).json({
//       success: false,
//       message: "Customer name and mobile are required",
//     });
//   }

//   const sql = `
//     INSERT INTO ele_customer_lead
//       (cust_name, cust_email, cust_mobile, moving_type, moving_from, moving_to, moving_date, home_type_id, city_name, lead_date, lead_generate_from)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)
//   `;

//   db.query(
//     sql,
//     [
//       cust_name || null,
//       cust_email || null,
//       cust_mobile || null,
//       moving_type || null,
//       moving_from || null,
//       moving_to || null,
//       moving_date || null,
//       home_type_id || null,
//       city_name || null,
//       // state_name || null,
//     ],
//     (err, result) => {
//       if (err) {
//         console.error("❌ DB Insert Error:", err);
//         return res
//           .status(500)
//           .json({ success: false, message: "DB insert failed" });
//       }

//       return res.status(201).json({
//         success: true,
//         message: "Lead created successfully",
//         lead_id: result.insertId,
//       });
//     }
//   );
// };

// todays update 2-10
// export const createLead = (req, res) => {
//   const {
//     cust_name,
//     cust_email,
//     cust_mobile,
//     moving_type,
//     moving_from,
//     moving_to,
//     moving_date,
//     home_type_id,
//     city_name,
//   } = req.body;

//   if (!cust_name || !cust_mobile) {
//     return res.status(400).json({
//       success: false,
//       message: "Customer name and mobile are required",
//     });
//   }

//   // 🔑 Generate Unique Lead ID (e.g., ELE17822523)
//   const randomLeadId = `ELE${Math.floor(10000000 + Math.random() * 90000000)}`;

//   const sql = `
//     INSERT INTO ele_customer_lead
//       (lead_id, cust_name, cust_email, cust_mobile, moving_type, moving_from, moving_to, moving_date, home_type_id, city_name, lead_date, lead_generate_from)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)
//   `;

//   db.query(
//     sql,
//     [
//       randomLeadId,
//       cust_name || null,
//       cust_email || null,
//       cust_mobile || null,
//       moving_type || null,
//       moving_from || null,
//       moving_to || null,
//       moving_date || null,
//       home_type_id || null,
//       city_name || null,
//     ],
//     (err, result) => {
//       if (err) {
//         console.error("❌ DB Insert Error:", err);
//         return res
//           .status(500)
//           .json({ success: false, message: "DB insert failed" });
//       }

//       return res.status(201).json({
//         success: true,
//         message: "Lead created successfully",
//         lead_id: result.insertId, // 👈 ये तुम्हारा custom Lead ID है
//       });
//     }
//   );
// };

// Account screen APIS
// GET /profile/:phone
// export const getProfile = (req, res) => {
//   const { phone } = req.params;
//   if (!phone) return res.status(400).json({ error: "Phone required" });

//   db.query(
//     "SELECT full_name, customer_email, customer_mobile_no, profile_photo FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
//     [phone],
//     (err, results) => {
//       if (err) return res.status(500).json({ error: "DB error" });
//       if (!results.length)
//         return res.status(404).json({ error: "User not found" });

//       res.json(results[0]);
//     }
//   );
// };
export const getProfile = (req, res) => {
  const { phone } = req.params;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  db.query(
    "SELECT id, full_name, customer_email, customer_mobile_no, profile_photo FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
    [phone],
    (err, results) => {
      if (err) return res.status(500).json({ error: "DB error" });
      if (!results.length)
        return res.status(404).json({ error: "User not found" });

      const user = results[0];

      // Default profile image (host this in your server)
      const defaultImage = "https://yourserver.com/default_avatar.png";

      res.json({
        id: user.id,
        full_name: user.full_name,
        customer_mobile_no: user.customer_mobile_no,
        customer_email: user.customer_email,
        profile_photo:
          user.profile_photo && user.profile_photo.trim() !== ""
            ? user.profile_photo
            : defaultImage,
      });
    }
  );
};

export const createLead = (req, res) => {
  const {
    cust_name,
    cust_email,
    cust_mobile,
    moving_type,
    moving_from,
    moving_to,
    moving_date,
    home_type_id,
    city_name,
    movingFromLat,
    movingFromLng,
    movingToLat,
    movingToLng,
    movingFromFloorNo,
    movingToFloorNo,
    movingFromServiceLift,
    movingToServiceLift,
    distance,
  } = req.body;

  if (!cust_name || !cust_mobile) {
    return res.status(400).json({
      success: false,
      message: "Customer name and mobile are required",
    });
  }

  const randomLeadId = `ELE${Math.floor(10000000 + Math.random() * 90000000)}`;

  const sql = `
    INSERT INTO ele_customer_lead 
      (
        lead_id, cust_name, cust_email, cust_mobile, 
        moving_type, moving_from, moving_to, moving_date, 
        home_type_id, city_name,
        movingFromLat, movingFromLng, movingToLat, movingToLng,
        moving_from_floor_no, moving_to_floor_no,
        moving_from_service_lift, moving_to_service_lift,
        approx_dist,
        lead_date, lead_generate_from, source
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1, "premove_app")
  `;

  db.query(
    sql,
    [
      randomLeadId,
      cust_name || null,
      cust_email || null,
      cust_mobile || null,
      moving_type || null,
      moving_from || null,
      moving_to || null,
      moving_date || null,
      home_type_id || null,
      city_name || null,
      movingFromLat || null,
      movingFromLng || null,
      movingToLat || null,
      movingToLng || null,
      movingFromFloorNo || null,
      movingToFloorNo || null,
      movingFromServiceLift || 0,
      movingToServiceLift || 0,
      distance || null,
    ],
    (err, result) => {
      if (err) {
        console.error("❌ DB Insert Error:", err);
        return res.status(500).json({
          success: false,
          message: "DB insert failed",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Lead created successfully",
        lead_id: result.insertId,
      });
    }
  );
};

export const updateProfile = (req, res) => {
  const { phone } = req.params;
  const { full_name, customer_email } = req.body;

  if (!phone || !full_name || !customer_email) {
    return res
      .status(400)
      .json({ error: "Phone, name, and email are required" });
  }

  // Update ele_customer_register using phone
  db.query(
    "UPDATE ele_customer_register SET full_name=?, customer_email=?, lastUpdationDate=NOW() WHERE customer_mobile_no=?",
    [full_name, customer_email, phone],
    (err1, result1) => {
      if (err1)
        return res
          .status(500)
          .json({ error: "Failed to update register table" });
      if (!result1.affectedRows)
        return res.status(404).json({ error: "User not found" });

      // Update ele_customer_lead using phone
      db.query(
        "UPDATE ele_customer_lead SET cust_name=?, cust_email=? WHERE cust_mobile=?",
        [full_name, customer_email, phone],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ error: "Failed to update lead table" });

          res.json({ success: true, message: "Profile updated successfully" });
        }
      );
    }
  );
};

// POST /feedback


// =======

// const upload = multer({ dest: "uploads/" });

export const updateProfileImage = (req, res) => {
  const { phone } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  // FULL URL (this is VERY IMPORTANT)
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  db.query(
    "UPDATE ele_customer_register SET profile_photo=? WHERE customer_mobile_no=?",
    [imageUrl, phone],
    (err) => {
      if (err) return res.status(500).json({ error: "Image update failed" });

      res.json({
        success: true,
        message: "Image updated successfully",
        profile_photo: imageUrl,
      });
    }
  );
};





export const submitFeedback = (req, res) => {
  const { phone, experience, option, comments } = req.body;
  if (!phone || !experience) {
    return res.status(400).json({ error: "Phone and experience are required" });
  }

  db.query(
    "INSERT INTO ele_customer_feedback (phone, experience, option_selected, comments, created_at) VALUES (?, ?, ?, ?, NOW())",
    [phone, experience, option || null, comments || null],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to save feedback" });
      res.json({ success: true, message: "Feedback submitted" });
    }
  );
};

// GET /feedback/:phone
export const getFeedbackByPhone = (req, res) => {
  const { phone } = req.params;

  db.query(
    "SELECT * FROM ele_customer_feedback WHERE phone=? ORDER BY created_at DESC",
    [phone],
    (err, results) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json(results);
    }
  );
};

// 30-10-25 changes
export const getCategories = (req, res) => {
  const sql = "SELECT * FROM ele_category";
  db.query(sql, (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(result);
  });
};

// ✅ Get Sub Categories by Category ID
export const getSubCategories = (req, res) => {
  const { categoryId } = req.params;
  const sql = "SELECT * FROM ele_sub_category WHERE category_id = ?";
  db.query(sql, [categoryId], (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(result);
  });
};

// ✅ Get Items by Sub Category ID
export const getSubCategoryItems = (req, res) => {
  const { subCategoryId } = req.params;
  const sql = "SELECT * FROM ele_sub_category_item WHERE sub_category_id = ?";
  db.query(sql, [subCategoryId], (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json(result);
  });
};

// visite
// export const scheduleVisit = (req, res) => {
//   const { lead_id, schedule_date, time_from, time_to } = req.body;

//   // Validate input
//   if (!lead_id || !schedule_date || !time_from || !time_to) {
//     return res.status(400).json({ success: false, message: "All fields required" });
//   }

//   // Fetch lead info
//   db.query(
//     "SELECT cust_name, cust_mobile, city_name as customer_city FROM ele_customer_lead WHERE id = ?",
//     [lead_id],
//     (err, rows) => {
//       if (err) {
//         console.error("❌ DB Error:", err);
//         return res.status(500).json({ success: false, message: "Database error" });
//       }

//       const leadInfo = rows[0];
//       if (!leadInfo) {
//         return res.status(404).json({ success: false, message: "Lead not found" });
//       }

//       // Insert visit request (without customer_id)
//       db.query(
//         `INSERT INTO customer_visite_request
//           (lead_id, customer_name, customer_number, customer_city, schedule_date, time_from, time_to)
//          VALUES (?, ?, ?, ?, ?, ?, ?)`,
//         [
//           lead_id,
//           leadInfo.cust_name,
//           leadInfo.cust_mobile,
//           leadInfo.customer_city,
//           schedule_date,
//           time_from,
//           time_to,
//         ],
//         (err2) => {
//           if (err2) {
//             console.error("❌ Insert Error:", err2);
//             return res.status(500).json({ success: false, message: "Database error" });
//           }

//           res.json({ success: true, message: "Visit scheduled successfully" });
//         }
//       );
//     }
//   );
// };

// export const scheduleVisit = (req, res) => {
//   const { lead_id, schedule_date, time_from, time_to } = req.body;

//   if (!lead_id || !schedule_date || !time_from || !time_to) {
//     return res.status(400).json({ success: false, message: "All fields required" });
//   }

//   // Check if a request already exists for this lead
//   db.query(
//     "SELECT * FROM customer_visite_request WHERE lead_id = ?",
//     [lead_id],
//     (err, rows) => {
//       if (err) {
//         console.error("❌ DB Error:", err);
//         return res.status(500).json({ success: false, message: "Database error" });
//       }

//       if (rows.length > 0) {
//         // Request already exists
//         return res.json({
//           success: false,
//           message: "You already have a visit request",
//           existingRequest: rows[0],
//         });
//       }

//       // Fetch lead info
//       db.query(
//         "SELECT cust_name, cust_mobile, city_name as customer_city FROM ele_customer_lead WHERE id = ?",
//         [lead_id],
//         (err2, leadRows) => {
//           if (err2) {
//             console.error("❌ DB Error:", err2);
//             return res.status(500).json({ success: false, message: "Database error" });
//           }

//           const leadInfo = leadRows[0];
//           if (!leadInfo) {
//             return res.status(404).json({ success: false, message: "Lead not found" });
//           }

//           // Insert new visit request
//           db.query(
//             `INSERT INTO customer_visite_request
//               (lead_id, customer_name, customer_number, customer_city, schedule_date, time_from, time_to)
//              VALUES (?, ?, ?, ?, ?, ?, ?)`,
//             [
//               lead_id,
//               leadInfo.cust_name,
//               leadInfo.cust_mobile,
//               leadInfo.customer_city,
//               schedule_date,
//               time_from,
//               time_to,
//             ],
//             (err3) => {
//               if (err3) {
//                 console.error("❌ Insert Error:", err3);
//                 return res.status(500).json({ success: false, message: "Database error" });
//               }

//               res.json({ success: true, message: "Visit scheduled successfully" });
//             }
//           );
//         }
//       );
//     }
//   );
// };
// export const scheduleVisit = (req, res) => {
//   const { lead_id, schedule_date, time_from, time_to } = req.body;

//   if (!lead_id || !schedule_date || !time_from || !time_to) {
//     return res
//       .status(400)
//       .json({ success: false, message: "All fields required" });
//   }

//   // Check if request already exists
//   db.query(
//     "SELECT * FROM customer_visite_request WHERE lead_id = ?",
//     [lead_id],
//     (err, rows) => {
//       if (err) {
//         console.error("❌ DB Error:", err);
//         return res
//           .status(500)
//           .json({ success: false, message: "Database error" });
//       }

//       if (rows.length > 0) {
//         return res.json({
//           success: false,
//           message: "You already have a visit request",
//           existingRequest: rows[0],
//           manager_id: rows[0].manager_id,
//         });
//       }

//       // Fetch lead info
//       db.query(
//         "SELECT cust_name, cust_mobile, city_name as customer_city FROM ele_customer_lead WHERE id = ?",
//         [lead_id],
//         (err2, leadRows) => {
//           if (err2) {
//             console.error("❌ DB Error:", err2);
//             return res
//               .status(500)
//               .json({ success: false, message: "Database error" });
//           }

//           const leadInfo = leadRows[0];
//           if (!leadInfo) {
//             return res
//               .status(404)
//               .json({ success: false, message: "Lead not found" });
//           }

//           // 👇 Find manager by city (ya jo logic tum use kar rahe ho assign karne ka)
//           db.query(
//             "SELECT id, name FROM ele_customer_manager WHERE assign_location = ? LIMIT 1",
//             [leadInfo.customer_city],
//             (err3, managerRows) => {
//               if (err3) {
//                 console.error("❌ DB Error:", err3);
//                 return res
//                   .status(500)
//                   .json({ success: false, message: "Database error" });
//               }

//               const manager = managerRows[0];
//               if (!manager) {
//                 return res.status(404).json({
//                   success: false,
//                   message: "No manager found for this city",
//                 });
//               }

//               // Insert visit request with manager_id
//               db.query(
//                 `INSERT INTO customer_visite_request
//                 (lead_id, customer_name, customer_number, customer_city, schedule_date, time_from, time_to, manager_id)
//                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//                 [
//                   lead_id,
//                   leadInfo.cust_name,
//                   leadInfo.cust_mobile,
//                   leadInfo.customer_city,
//                   schedule_date,
//                   time_from,
//                   time_to,
//                   manager.id,
//                 ],
//                 (err4) => {
//                   if (err4) {
//                     console.error("❌ Insert Error:", err4);
//                     return res
//                       .status(500)
//                       .json({ success: false, message: "Database error" });
//                   }

//                   res.json({
//                     success: true,
//                     message: "Visit scheduled successfully",
//                     manager_id: manager.id, // 👈 ye frontend me bhej do
//                   });
//                 }
//               );
//             }
//           );
//         }
//       );
//     }
//   );
// };
// export const scheduleVisit = (req, res) => {
//   const { lead_id, schedule_date, time_from, time_to } = req.body;

//   if (!lead_id || !schedule_date || !time_from || !time_to) {
//     return res
//       .status(400)
//       .json({ success: false, message: "All fields required" });
//   }

//   // 🔍 Step 1: Check if visit request already exists
//   db.query(
//     "SELECT * FROM customer_visite_request WHERE lead_id = ?",
//     [lead_id],
//     (err, rows) => {
//       if (err) {
//         console.error("❌ DB Error:", err);
//         return res
//           .status(500)
//           .json({ success: false, message: "Database error" });
//       }

//       // ✅ If a visit request already exists
//       if (rows.length > 0) {
//         const existing = rows[0];

//         // 🔹 If status is complete → return special message
//         if (existing.status === "complete") {
//           return res.json({
//             success: false,
//             message: "Inspection for this request is already completed",
//             existingRequest: existing,
//             manager_id: existing.manager_id,
//             status: "complete",
//           });
//         }

//         // 🔹 If still pending → show normal existing request
//         return res.json({
//           success: false,
//           message: "You already have a visit request in progress",
//           existingRequest: existing,
//           manager_id: existing.manager_id,
//           status: existing.status || "pending",
//         });
//       }

//       // 🔍 Step 2: Fetch lead info
//       db.query(
//         "SELECT cust_name, cust_mobile, city_name as customer_city FROM ele_customer_lead WHERE id = ?",
//         [lead_id],
//         (err2, leadRows) => {
//           if (err2) {
//             console.error("❌ DB Error:", err2);
//             return res
//               .status(500)
//               .json({ success: false, message: "Database error" });
//           }

//           const leadInfo = leadRows[0];
//           if (!leadInfo) {
//             return res
//               .status(404)
//               .json({ success: false, message: "Lead not found" });
//           }

//           // 👇 Step 3: Find manager by assigned city
//           db.query(
//             "SELECT id, name FROM ele_customer_manager WHERE assign_location = ? LIMIT 1",
//             [leadInfo.customer_city],
//             (err3, managerRows) => {
//               if (err3) {
//                 console.error("❌ DB Error:", err3);
//                 return res
//                   .status(500)
//                   .json({ success: false, message: "Database error" });
//               }

//               const manager = managerRows[0];
//               if (!manager) {
//                 return res.status(404).json({
//                   success: false,
//                   message: "No manager found for this city",
//                 });
//               }

//               // ✅ Step 4: Insert new visit request with status = 'pending'
//               const insertQuery = `
//                 INSERT INTO customer_visite_request
//                 (lead_id, customer_name, customer_number, customer_city, schedule_date, time_from, time_to, manager_id, status)
//                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
//               `;

//               db.query(
//                 insertQuery,
//                 [
//                   lead_id,
//                   leadInfo.cust_name,
//                   leadInfo.cust_mobile,
//                   leadInfo.customer_city,
//                   schedule_date,
//                   time_from,
//                   time_to,
//                   manager.id,
//                 ],
//                 (err4, result) => {
//                   if (err4) {
//                     console.error("❌ Insert Error:", err4);
//                     return res
//                       .status(500)
//                       .json({ success: false, message: "Database error" });
//                   }

//                   // ✅ Step 5: Fetch inserted record
//                   db.query(
//                     "SELECT * FROM customer_visite_request WHERE id = ?",
//                     [result.insertId],
//                     (err5, insertedRows) => {
//                       if (err5) {
//                         console.error("❌ Fetch Error:", err5);
//                         return res
//                           .status(500)
//                           .json({ success: false, message: "Database error" });
//                       }

//                       res.json({
//                         success: true,
//                         message: "Visit scheduled successfully",
//                         manager_id: manager.id,
//                         status: insertedRows[0].status || "pending",
//                         newRequest: insertedRows[0],
//                       });
//                     }
//                   );
//                 }
//               );
//             }
//           );
//         }
//       );
//     }
//   );
// };
export const scheduleVisit = (req, res) => {
  const { lead_id, schedule_date, time_from, time_to } = req.body;

  if (!lead_id || !schedule_date || !time_from || !time_to) {
    return res
      .status(400)
      .json({ success: false, message: "All fields required" });
  }

  // 🔍 Step 1: Check if visit request already exists
  db.query(
    "SELECT * FROM customer_visite_request WHERE lead_id = ?",
    [lead_id],
    (err, rows) => {
      if (err) {
        console.error("❌ DB Error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      // ✅ If a visit request already exists
      if (rows.length > 0) {
        const existing = rows[0];

        // 🔹 If status is complete → return special message
        if (existing.status === "complete") {
          return res.json({
            success: false,
            message: "Inspection for this request is already completed",
            existingRequest: existing,
            manager_id: existing.manager_id,
            status: "complete",
          });
        }

        // 🔹 If still pending → show normal existing request
        return res.json({
          success: false,
          message: "You already have a visit request in progress",
          existingRequest: existing,
          manager_id: existing.manager_id,
          status: existing.status || "pending",
        });
      }

      // 🔍 Step 2: Fetch lead info
      db.query(
        "SELECT cust_name, cust_mobile, city_name as customer_city FROM ele_customer_lead WHERE id = ?",
        [lead_id],
        (err2, leadRows) => {
          if (err2) {
            console.error("❌ DB Error:", err2);
            return res
              .status(500)
              .json({ success: false, message: "Database error" });
          }

          const leadInfo = leadRows[0];
          if (!leadInfo) {
            return res
              .status(404)
              .json({ success: false, message: "Lead not found" });
          }

          // 👇 Step 3: Try to find manager by assigned city
          db.query(
            "SELECT id, name FROM ele_customer_manager WHERE assign_location = ? LIMIT 1",
            [leadInfo.customer_city],
            (err3, managerRows) => {
              if (err3) {
                console.error("❌ DB Error:", err3);
                return res
                  .status(500)
                  .json({ success: false, message: "Database error" });
              }

              let manager = managerRows[0];

              // 🔁 Step 3B: If no manager found, assign to Head_Manager
              const assignVisit = (managerToUse) => {
                // ✅ Step 4: Insert new visit request with status = 'pending'
                const insertQuery = `         
                  INSERT INTO customer_visite_request 
                  (lead_id, customer_name, customer_number, customer_city, schedule_date, time_from, time_to, manager_id, status) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                `;

                db.query(
                  insertQuery,
                  [
                    lead_id,
                    leadInfo.cust_name,
                    leadInfo.cust_mobile,
                    leadInfo.customer_city,
                    schedule_date,
                    time_from,
                    time_to,
                    managerToUse.id,
                  ],
                  (err4, result) => {
                    if (err4) {
                      console.error("❌ Insert Error:", err4);
                      return res
                        .status(500)
                        .json({ success: false, message: "Database error" });
                    }

                    // ✅ Step 5: Fetch inserted record
                    db.query(
                      "SELECT * FROM customer_visite_request WHERE id = ?",
                      [result.insertId],
                      (err5, insertedRows) => {
                        if (err5) {
                          console.error("❌ Fetch Error:", err5);
                          return res.status(500).json({
                            success: false,
                            message: "Database error",
                          });
                        }

                        res.json({
                          success: true,
                          message: "Visit scheduled successfully",
                          manager_id: managerToUse.id,
                          status: insertedRows[0].status || "pending",
                          newRequest: insertedRows[0],
                        });
                      }
                    );
                  }
                );
              };

              // ✅ If no manager found, fetch Head_Manager instead
              if (!manager) {
                console.log(
                  "⚠️ No manager found for city. Assigning to Head_Manager..."
                );
                db.query(
                  "SELECT id, name FROM ele_customer_manager WHERE user_role = 'Head_Manager' LIMIT 1",
                  (err4, headRows) => {
                    if (err4) {
                      console.error("❌ DB Error:", err4);
                      return res
                        .status(500)
                        .json({ success: false, message: "Database error" });
                    }

                    const headManager = headRows[0];
                    if (!headManager) {
                      return res.status(404).json({
                        success: false,
                        message:
                          "No manager or head manager found for this request",
                      });
                    }

                    // ✅ Assign to Head Manager
                    assignVisit(headManager);
                  }
                );
              } else {
                // ✅ Assign to found city manager
                assignVisit(manager);
              }
            }
          );
        }
      );
    }
  );
};

// tracking

export const getTrackingData = async (req, res) => {
  const { visitRequestId } = req.params;

  try {
    // Step 1: Find visit request entry
    const [visitRows] = await db
      .promise()
      .query(
        "SELECT manager_id, lead_id FROM customer_visite_request WHERE id = ?",
        [visitRequestId]
      );

    if (!visitRows.length) {
      return res.json({ success: false, message: "Visit request not found" });
    }

    const { manager_id, lead_id } = visitRows[0];
    console.log("customer id", lead_id);
    console.log("manager id", manager_id);
    // Step 2: Get manager location
    const [managerRows] = await db
      .promise()
      .query(
        "SELECT latitude, longitude FROM ele_customer_manager WHERE id = ?",
        [manager_id]
      );

    // Step 3: Get customer location
    const [customerRows] = await db
      .promise()
      .query(
        "SELECT movingFromLat AS latitude, movingFromLng AS longitude FROM ele_customer_lead WHERE id = ?",
        [lead_id]
      );

    if (!managerRows.length || !customerRows.length) {
      return res.json({
        success: false,
        message: "Manager or Customer location not found",
      });
    }

    const manager = managerRows[0];
    const customer = customerRows[0];

    return res.json({
      success: true,
      manager,
      customer,
    });
  } catch (err) {
    console.error("Error fetching tracking data:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

// GET /manager/:id
export const getManagerDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT name, phone_number FROM ele_customer_manager WHERE id = ?",
        [id]
      );
    if (!rows.length)
      return res.json({ success: false, message: "Manager not found" });
    res.json({ success: true, manager: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
};
export const getVisitStatus = (req, res) => {
  const { leadId } = req.params;

  const query =
    "SELECT status FROM customer_visite_request WHERE lead_id = ? LIMIT 1";

  db.query(query, [leadId], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching visit status:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (rows.length > 0) {
      return res.json({ status: rows[0].status });
    } else {
      return res.json({ status: null });
    }
  });
};

export const checkVisit = (req, res) => {
  const { lead_id } = req.body || {};
  console.log("lead id  backend", lead_id);
  if (!lead_id)
    return res
      .status(400)
      .json({ success: false, message: "lead_id required" });

  db.query(
    "SELECT * FROM customer_visite_request WHERE lead_id = ?",
    [lead_id],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      if (rows.length > 0) {
        return res.json({
          success: true,
          existingRequest: rows[0],
          manager_id: rows[0].manager_id,
          status: rows[0].status,
        });
      } else {
        return res.json({ success: true, existingRequest: null });
      }
    }
  );
};

// ========================manager accept

export const managerAcceptVisit = (req, res) => {
  const { request_id } = req.body;

  if (!request_id)
    return res.json({ success: false, message: "request_id required" });

  const q = `
    UPDATE customer_visite_request 
    SET manager_accept_status='accepted', customer_accept_status='accepted', status='approved'
    WHERE id=?
  `;

  db.query(q, [request_id], (err, result) => {
    if (err) return res.json({ success: false, message: "DB error" });

    return res.json({
      success: true,
      message: "Inspection visit accepted successfully",
    });
  });
};

export const managerRescheduleVisit = (req, res) => {
  const { request_id, new_date, new_time_from, new_time_to, reason } = req.body;

  if (!request_id || !new_date || !new_time_from || !new_time_to || !reason) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  // STEP 1: Fetch original visit row (to get customer_number + manager_id)
  const selectQuery = "SELECT * FROM customer_visite_request WHERE id = ?";

  db.query(selectQuery, [request_id], async (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: "DB Error" });
    }

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Visit request not found" });
    }

    const visit = rows[0];
    const customer_number = visit.customer_number;
    const customer_name = visit.customer_name;

    // STEP 2: Update reschedule fields
    const updateQuery = `
      UPDATE customer_visite_request 
      SET 
        manager_reschedule_date = ?,
        manager_reschedule_time_from = ?,
        manager_reschedule_time_to = ?,
        reschedule_reason = ?,
        status = 'reschedule_by_manager',
        manager_accept_status = 'pending',
        customer_accept_status = 'pending'
      WHERE id = ?
    `;

    db.query(
      updateQuery,
      [new_date, new_time_from, new_time_to, reason, request_id],
      async (err2, result) => {
        if (err2) {
          console.log(err2);
          return res
            .status(500)
            .json({ success: false, message: "Update failed" });
        }

        // STEP 3: Send WhatsApp message to customer
        try {
          await axios.post(
            "http://whatsappapi.keepintouch.co.in/api/sendText",
            {
              token: "6103d1857f26a4cb49bbc8cc",
              phone: customer_number,
              message: `Hello ${customer_name},\n\nYour manager has requested to reschedule your visit.\n\n📅 New Date: ${new_date}\n⏰ Time: ${new_time_from} - ${new_time_to}\n📝 Reason: ${reason}\n\nPlease check and respond.`,
            }
          );
        } catch (wErr) {
          console.log("WhatsApp Error:", wErr);
        }

        return res.json({
          success: true,
          message: "Visit rescheduled successfully",
        });
      }
    );
  });
};

export const customerAcceptReschedule = (req, res) => {
  const { request_id } = req.body;

  const q = `
    UPDATE customer_visite_request 
    SET customer_accept_status='accepted', status='approved'
    WHERE id=?
  `;

  db.query(q, [request_id], (err) => {
    if (err) return res.json({ success: false, message: "DB error" });

    return res.json({ success: true, message: "Reschedule accepted" });
  });
};

export const customerRescheduleVisit = (req, res) => {
  const { request_id, new_date, new_time_from, new_time_to, reason } = req.body;

  // Step 1: get customer phone number + manager id from DB
  const getUserQuery = `
    SELECT customer_number, manager_id 
    FROM customer_visite_request 
    WHERE id=?
  `;

  db.query(getUserQuery, [request_id], (err, result) => {
    if (err) return res.json({ success: false, message: "DB error" });

    if (result.length === 0)
      return res.json({ success: false, message: "Request not found" });

    const customer_number = result[0].customer_number;
    const manager_id = result[0].manager_id;

    // Step 2: Update reschedule
    const updateQuery = `
      UPDATE customer_visite_request 
      SET 
        manager_reschedule_date=?, 
        manager_reschedule_time_from=?, 
        manager_reschedule_time_to=?, 
        reschedule_reason=?,
        status='reschedule_by_customer',
        customer_accept_status='pending',
        manager_accept_status='pending'
      WHERE id=?
    `;

    db.query(
      updateQuery,
      [new_date, new_time_from, new_time_to, reason, request_id],
      (err2) => {
        if (err2) {
          console.log(err2);
          return res.json({ success: false, message: "Update failed" });
        }

        // Step 3: Send WhatsApp to Manager
        axios
          .post("http://whatsappapi.keepintouch.co.in/api/sendText", {
            token: "6103d1857f26a4cb49bbc8cc",
            phone: customer_number,
            message: `Customer requested reschedule:\n📅 ${new_date}\n⏰ ${new_time_from} - ${new_time_to}\nReason: ${reason}`,
          })
          .catch((err) => console.log("WhatsApp Error", err));

        return res.json({
          success: true,
          message: "Visit rescheduled by customer",
        });
      }
    );
  });
};
