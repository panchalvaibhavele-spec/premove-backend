import db from "../config/db.js";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const WHATSAPP_API_URL = "http://whatsappapi.keepintouch.co.in/api/sendText";
// const WHATSAPP_TOKEN = "6103d1857f26a4cb49bbc8cc"; // replace with your token
const WHATSAPP_TOKEN = ""; // replace with your token
const JWT_SECRET = "YOUR_SECRET_KEY";

// in-memory OTP store
let otpStore = {};

// ✅ Generate random OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ✅ Send OTP
export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  db.query(
    "SELECT id FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
    [phone],
    async (err, results) => {
      if (err) return res.status(500).json({ error: "DB error" });
      if (!results.length)
        return res.json({ success: false, error: "Phone not registered" });

      const otp = generateOTP();
      otpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };
      console.log(`OTP for ${phone}: ${otp}`);

      try {
        const msg = `Dear Customer, your one-time password (OTP) for login is ${otp}. This code is valid for a short time. Please keep it confidential.`;

        await fetch(
          `${WHATSAPP_API_URL}?token=${WHATSAPP_TOKEN}&phone=91${phone}&message=${encodeURIComponent(
            msg
          )}`
        );
        res.json({ success: true, message: "OTP sent via WhatsApp" });
      } catch (error) {
        console.error("❌ WhatsApp send error:", error);
        res.status(500).json({ error: "Failed to send OTP" });
      }
    }
  );
};

// ✅ Verify OTP
// export const verifyOtp = (req, res) => {
//   const { phone, otp } = req.body;
//   const record = otpStore[phone];

//   if (!record) return res.status(400).json({ error: "OTP not found" });
//   if (record.expires < Date.now())
//     return res.status(400).json({ error: "OTP expired" });
//   if (record.otp != otp) return res.status(400).json({ error: "Invalid OTP" });

//   // remove OTP once used
//   delete otpStore[phone];

//   db.query(
//     "SELECT * FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
//     [phone],
//     (err, results) => {
//       if (err) return res.status(500).json({ error: "DB error" });
//       const user = results[0];

//       // create JWT
//       const token = jwt.sign({ id: user.id, phone }, JWT_SECRET, {
//         expiresIn: "30d",
//       });
//       const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;

//       // save JWT in DB
//       db.query(
//         "UPDATE ele_customer_register SET jwt_token=?, jwt_expiry=? WHERE id=?",
//         [token, expiry, user.id],
//         (err2) => {
//           if (err2) console.error("❌ JWT save error:", err2);
//           res.json({
//             success: true,
//             token,
//             expiry,
//             user,
//           });
//         }
//       );
//     }
//   );
// };
export const verifyOtp = (req, res) => {
  const { phone, otp } = req.body;

  // 1️⃣ --- LOGIN OTP (in-memory OTP) ---
  const record = otpStore[phone];

  if (record) {
    if (record.expires < Date.now())
      return res.status(400).json({ error: "OTP expired" });

    if (record.otp != otp)
      return res.status(400).json({ error: "Invalid OTP" });

    delete otpStore[phone];

    // find user
    db.query(
      "SELECT * FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
      [phone],
      (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!results.length)
          return res.status(400).json({ error: "User not found" });

        const user = results[0];

        // Create JWT
        const token = jwt.sign({ id: user.id, phone }, JWT_SECRET, {
          expiresIn: "30d",
        });
        const expiry = Date.now() + 30 * 86400000;

        db.query(
          "UPDATE ele_customer_register SET jwt_token=?, jwt_expiry=? WHERE id=?",
          [token, expiry, user.id],
          () => {
            return res.json({
              success: true,
              message: "Login OTP verified",
              token,
              expiry,
              user,
            });
          }
        );
      }
    );
    return;
  }

  // 2️⃣ --- REGISTRATION OTP (stored in DB) ---
  db.query(
    "SELECT * FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
    [phone],
    (err, results) => {
      if (err || !results.length)
        return res.status(400).json({ error: "User not found" });

      const user = results[0];

      if (user.emailOtp != otp)
        return res.status(400).json({ error: "Invalid OTP" });

      // Mark email verified
      db.query(
        "UPDATE ele_customer_register SET isEmailVerify=1, emailOtp=NULL WHERE id=?",
        [user.id],
        (err2) => {
          if (err2)
            return res.status(500).json({ error: "Failed to update OTP" });

          // Auto-login (same as login OTP)
          const token = jwt.sign({ id: user.id, phone }, JWT_SECRET, {
            expiresIn: "30d",
          });
          const expiry = Date.now() + 30 * 86400000;

          db.query(
            "UPDATE ele_customer_register SET jwt_token=?, jwt_expiry=? WHERE id=?",
            [token, expiry, user.id],
            () => {
              return res.json({
                success: true,
                message: "Registration OTP verified",
                token,
                expiry,
                user,
              });
            }
          );
        }
      );
    }
  );
};

// ✅ Check JWT (auto login)
export const checkJwt = (req, res) => {
  const { phone } = req.query;

  db.query(
    "SELECT * FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
    [phone],
    (err, results) => {
      if (err || !results.length) return res.json({ success: false });

      const user = results[0];
      if (user.jwt_token && user.jwt_expiry && Date.now() < user.jwt_expiry) {
        return res.json({
          success: true,
          token: user.jwt_token,
          expiry: user.jwt_expiry,
          user,
        });
      }
      res.json({ success: false });
    }
  );
};

// register OTP
export const registerCustomer = async (req, res) => {
  const { full_name, customer_email, customer_mobile_no } = req.body;

  if (!full_name || !customer_email || !customer_mobile_no) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1️⃣ Check if already registered
    db.query(
      "SELECT id FROM ele_customer_register WHERE customer_mobile_no=? OR customer_email=? LIMIT 1",
      [customer_mobile_no, customer_email],
      async (err, results) => {
        if (err) {
          console.error("❌ DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        if (results.length > 0) {
          return res.status(400).json({ error: "User already registered" });
        }

        // 2️⃣ Generate OTP and insert new user
        const otp = generateOTP();
        console.log(otp);
        db.query(
          "INSERT INTO ele_customer_register (full_name, customer_email, customer_mobile_no, emailOtp, isEmailVerify, Created_date) VALUES (?, ?, ?, ?, 0, NOW())",
          [full_name, customer_email, customer_mobile_no, otp],
          async (err2) => {
            if (err2) {
              console.error("❌ Insert error:", err2);
              return res.status(500).json({ error: "Registration failed" });
            }

            // 3️⃣ Send OTP via WhatsApp
            const msg = `Welcome ${full_name}! Your registration OTP is ${otp}. Please verify to complete your registration.`;
            try {
              await fetch(
                `${WHATSAPP_API_URL}?token=${WHATSAPP_TOKEN}&phone=91${customer_mobile_no}&message=${encodeURIComponent(
                  msg
                )}`
              );
            } catch (e) {
              console.error("❌ WhatsApp send error:", e);
            }

            res.json({
              success: true,
              message:
                "OTP sent successfully! Please verify to complete registration.",
            });
          }
        );
      }
    );
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ VERIFY REGISTRATION OTP
export const verifyRegisterOtp = (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP required" });
  }

  db.query(
    "SELECT id, emailOtp FROM ele_customer_register WHERE customer_mobile_no=? LIMIT 1",
    [phone],
    (err, results) => {
      if (err || !results.length) {
        return res.status(400).json({ error: "User not found" });
      }

      const user = results[0];

      if (user.emailOtp != otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      db.query(
        "UPDATE ele_customer_register SET isEmailVerify=1, emailOtp=NULL WHERE id=?",
        [user.id],
        (err2) => {
          if (err2) {
            console.error("❌ DB update error:", err2);
            return res.status(500).json({ error: "Verification failed" });
          }

          res.json({ success: true, message: "Email verified successfully!" });
        }
      );
    }
  );
};
