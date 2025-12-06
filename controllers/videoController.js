import db from "../config/db.js";
import path from "path";
import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";
"C:/ffmpeg-8.0-essentials_build/ffmpeg-8.0-essentials_build/bin/"
// 🧩 Explicitly set ffmpeg path for Windows (recommended)
Ffmpeg.setFfmpegPath(
  "C:/ffmpeg-8.0-essentials_build/ffmpeg-8.0-essentials_build/bin/ffmpeg.exe"
);
Ffmpeg.setFfprobePath(
  "C:/ffmpeg-8.0-essentials_build/ffmpeg-8.0-essentials_build/bin/ffprobe.exe"
);
const WHATSAPP_API_URL = "http://whatsappapi.keepintouch.co.in/api/sendText";
const WHATSAPP_TOKEN = "6103d1857f26a4cb49bbc8cc";
// import ffmpeg from "fluent-ffmpeg";
// export const saveCustomerVideo = (req, res) => {
//   try {
//     const { lead_id, cus_number } = req.body;

//     if (!lead_id || !cus_number) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing lead_id or cus_number",
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No video uploaded",
//       });
//     }

//     const videoPath = `/uploads/videos/${req.file.filename}`;

//     const sql = `INSERT INTO ele_customer_videos (lead_id, cus_number, video_path)
//                  VALUES (?, ?, ?)`;

//     db.query(sql, [lead_id, cus_number, videoPath], (err, result) => {
//       if (err) {
//         console.error("❌ Error saving video:", err);
//         return res
//           .status(500)
//           .json({ success: false, message: "Server error" });
//       }

//       return res.status(201).json({
//         success: true,
//         message: "Video uploaded successfully",
//         video: {
//           id: result.insertId,
//           lead_id,
//           cus_number,
//           video_path: videoPath,
//         },
//       });
//     });
//   } catch (error) {
//     console.error("❌ Exception:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// Manager ke assign_location ke hisaab se videos fetch karna
// ==========================================
// export const saveCustomerVideo = (req, res) => {
//   if (!req.file) {
//     return res
//       .status(400)
//       .json({ success: false, message: "No video uploaded" });
//   }

//   const { lead_id, cus_number } = req.body;

//   // Original path
//   const inputPath = req.file.path;

//   // Compressed output path
//   const outputFilename = Date.now() + "-compressed.mp4";
//   const outputPath = path.join("uploads/videos/", outputFilename);

//   // 🔥 Compress video to MP4 (H.264 codec, 360p)
//   Ffmpeg(inputPath)
//     .outputOptions([
//       "-c:v libx264", // video codec
//       "-preset veryfast", // compression speed/quality tradeoff
//       "-crf 28", // quality (lower = better, 28 ~ 360p-480p good size)
//       "-vf scale=640:-2", // resize width=640px, height auto (approx 360p)
//       "-c:a aac", // audio codec
//       "-b:a 128k", // audio bitrate
//     ])
//     .save(outputPath)
//     .on("end", () => {
//       // Delete original big file
//       fs.unlinkSync(inputPath);

//       // Save to DB
//       const sql = `
//         INSERT INTO ele_customer_videos (lead_id, cus_number, video_path)
//         VALUES (?, ?, ?)
//       `;
//       db.query(sql, [lead_id, cus_number, outputPath], (err, result) => {
//         if (err) {
//           console.error("❌ DB Insert Error:", err);
//           return res.status(500).json({ success: false, message: "DB error" });
//         }
//         return res.json({
//           success: true,
//           message: "Video uploaded & compressed successfully",
//           video_path: outputPath,
//         });
//       });
//     })
//     .on("error", (err) => {
//       console.error("❌ Compression error:", err);
//       return res
//         .status(500)
//         .json({ success: false, message: "Video compression failed" });
//     });
// };
// ===============
// export const saveCustomerVideo = (req, res) => {
//   if (!req.file) {
//     return res
//       .status(400)
//       .json({ success: false, message: "No video uploaded" });
//   }

//   const { lead_id, cus_number } = req.body;

//   const inputPath = req.file.path;
//   const outputFilename = Date.now() + "-compressed.mp4";
//   const outputPath = path.join("uploads/videos/", outputFilename);

//   Ffmpeg(inputPath)
//     .outputOptions([
//       "-c:v libx264",
//       "-preset veryfast",
//       "-crf 28",
//       "-vf scale=640:-2",
//       "-c:a aac",
//       "-b:a 128k",
//     ])
//     .save(outputPath)
//     .on("end", () => {
//       try {
//         fs.unlinkSync(inputPath);
//       } catch {}

//       db.query(
//         `INSERT INTO ele_customer_videos (lead_id, cus_number, video_path)
//          VALUES (?, ?, ?)`,
//         [lead_id, cus_number, outputPath],
//         (err) => {
//           if (err) return res.status(500).json({ success: false });

//           // ===========================
//           // FETCH CUSTOMER & CITY DATA
//           // ===========================
//           db.query(
//             `SELECT cust_name AS customer_name, moving_to AS city_name
//              FROM ele_customer_lead
//              WHERE id=? LIMIT 1`,
//             [lead_id],
//             (err2, leadRes) => {
//               if (err2 || !leadRes.length) {
//                 return res.json({
//                   success: true,
//                   message: "Video uploaded but lead not found",
//                 });
//               }

//               const { customer_name, city_name } = leadRes[0];

//               // ===========================
//               // FIND MANAGER BY CITY
//               // ===========================
//               console.log("CITY FOR MATCH:", city_name);

//               db.query(
//                 `SELECT phone_number
//    FROM ele_customer_manager
//    WHERE TRIM(LOWER(assign_location)) = TRIM(LOWER(?))
//      AND status='active'
//    LIMIT 1`,
//                 [city_name],
//                 async (err3, managerRes) => {
//                   let managerPhone;

//                   if (managerRes?.length > 0) {
//                     managerPhone = managerRes[0].phone_number;
//                     console.log("CITY MANAGER FOUND:", managerPhone);
//                   } else {
//                     console.log("NO CITY MANAGER → TRYING HEAD MANAGER...");
//                     const headManager = await new Promise((resolve) => {
//                       db.query(
//                         `SELECT phone_number
//                          FROM ele_customer_manager
//                          WHERE user_role='Head_Manager' LIMIT 1`,
//                         (err4, headRes) => {
//                           if (err4 || !headRes.length) resolve(null);
//                           else resolve(headRes[0]);
//                         }
//                       );
//                     });

//                     if (headManager) {
//                       managerPhone = headManager.phone_number;
//                       console.log("HEAD MANAGER SELECTED:", managerPhone);
//                     }
//                   }

//                   if (!managerPhone) {
//                     return res.json({
//                       success: true,
//                       message: "Video uploaded but NO manager found",
//                     });
//                   }

//                   // ===========================
//                   // WHATSAPP SEND
//                   // ===========================
//                   const message = `📹 New Inspection Video\nCustomer: ${customer_name}\nLead ID: ${lead_id}\nCity: ${city_name}`;

//                   console.log("SENDING WHATSAPP TO:", managerPhone);

//                   try {
//                     await fetch(
//                       `${WHATSAPP_API_URL}?token=${WHATSAPP_TOKEN}&phone=91${managerPhone}&message=${encodeURIComponent(
//                         message
//                       )}`
//                     );
//                   } catch (e) {
//                     console.log("WHATSAPP ERROR:", e);
//                   }

//                   return res.json({
//                     success: true,
//                     message: "Video uploaded & manager notified",
//                   });
//                 }
//               );
//             }
//           );
//         }
//       );
//     })
//     .on("error", (err) => {
//       return res.status(500).json({
//         success: false,
//         message: "Video compression failed",
//       });
//     });
// };
// ====================
export const saveCustomerVideo = (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No video uploaded" });
  }

  const { lead_id, cus_number } = req.body;

  const inputPath = req.file.path;
  const outputFilename = Date.now() + "-compressed.mp4";
  const outputPath = path.join("uploads/videos/", outputFilename);

  Ffmpeg(inputPath)
    .outputOptions([
      "-c:v libx264",
      "-preset veryfast",
      "-crf 28",
      "-vf scale=640:-2",
      "-c:a aac",
      "-b:a 128k",
    ])
    .save(outputPath)
    .on("end", () => {
      try {
        fs.unlinkSync(inputPath);
      } catch {}

      db.query(
        `INSERT INTO ele_customer_videos (lead_id, cus_number, video_path)
         VALUES (?, ?, ?)`,
        [lead_id, cus_number, outputPath],
        (err) => {
          if (err) return res.status(500).json({ success: false });

          // ===========================
          // FETCH CUSTOMER CITY
          // ===========================
          db.query(
            `SELECT cust_name AS customer_name, city_name AS city_name 
             FROM ele_customer_lead 
             WHERE id=? LIMIT 1`,
            [lead_id],
            (err2, leadRes) => {
              if (err2 || !leadRes.length) {
                return res.json({
                  success: true,
                  message: "Video uploaded but lead not found",
                });
              }

              const { customer_name, city_name } = leadRes[0];

              console.log("\n===========================");
              console.log("📌 LEAD CITY RECEIVED:", `"${city_name}"`);
              console.log("===========================\n");

              // PRINT ALL MANAGER LOCATIONS TO DEBUG
              db.query(
                `SELECT id, assign_location, phone_number FROM ele_customer_manager`,
                (e5, managers) => {
                  console.log("📍 ALL MANAGER LOCATIONS IN DB:");
                  managers.forEach((m) => {
                    console.log(
                      ` → ID:${m.id} | assign_location:"${m.assign_location}" | Phone:${m.phone_number}`
                    );
                  });

                  console.log("\n===========================\n");

                  // NOW FIND MATCHING MANAGER
                  db.query(
                    `SELECT phone_number 
                     FROM ele_customer_manager 
                     WHERE TRIM(LOWER(assign_location)) = TRIM(LOWER(?))
                       AND status='active'
                     LIMIT 1`,
                    [city_name],
                    async (err3, managerRes) => {
                      let managerPhone = null;

                      if (managerRes?.length > 0) {
                        managerPhone = managerRes[0].phone_number;
                        console.log("✅ CITY MANAGER FOUND:", managerPhone);
                      } else {
                        console.log(
                          "❌ CITY MANAGER NOT FOUND → TRYING HEAD MANAGER…"
                        );

                        const headManager = await new Promise((resolve) => {
                          db.query(
                            `SELECT phone_number 
                             FROM ele_customer_manager 
                             WHERE user_role='Head_Manager' LIMIT 1`,
                            (err4, headRes) => {
                              if (err4 || !headRes.length) resolve(null);
                              else resolve(headRes[0]);
                            }
                          );
                        });

                        if (headManager) {
                          managerPhone = headManager.phone_number;
                          console.log("✔ HEAD MANAGER USED:", managerPhone);
                        }
                      }

                      if (!managerPhone) {
                        return res.json({
                          success: true,
                          message: "Video uploaded but NO manager found",
                        });
                      }

                      // SEND WHATSAPP
                      const message = `📹 New Inspection Video\nCustomer: ${customer_name}\nLead ID: ${lead_id}\nCity: ${city_name}`;

                      console.log("📤 SENDING WHATSAPP TO:", managerPhone);

                      try {
                        await fetch(
                          `${WHATSAPP_API_URL}?token=${WHATSAPP_TOKEN}&phone=91${managerPhone}&message=${encodeURIComponent(
                            message
                          )}`
                        );
                      } catch (e) {
                        console.log("WHATSAPP ERROR:", e);
                      }

                      return res.json({
                        success: true,
                        message: "Video uploaded & manager notified",
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    })
    .on("error", () => {
      return res.status(500).json({
        success: false,
        message: "Video compression failed",
      });
    });
};

export const getManagerVideos = (req, res) => {
  const { managerId } = req.params;
  console.log("manager id :", managerId);

  const sql = `
       SELECT v.id, v.video_path, v.uploaded_at,
           l.cust_name, l.cust_mobile, l.city_name
    FROM ele_customer_videos v
    JOIN ele_customer_lead l ON v.lead_id = l.id
    JOIN ele_customer_manager m ON m.id = ?
    WHERE l.city_name = m.assign_location 
      AND v.lead_id = l.id  -- ✅ extra safety condition
    ORDER BY v.uploaded_at DESC
  `;

  db.query(sql, [managerId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching videos:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    return res.json({ success: true, videos: results });
  });
};

// 26-2025 todays changes

export const getLeadVideos = (req, res) => {
  const { leadId } = req.params;

  const sql = `
    SELECT v.id, v.video_path, v.uploaded_at,
           v.viewed_by_manager,
           l.cust_name, l.cust_mobile, l.city_name
    FROM ele_customer_videos v
    JOIN ele_customer_lead l ON v.lead_id = l.id
    WHERE v.lead_id = ?
    ORDER BY v.uploaded_at DESC
  `;

  db.query(sql, [leadId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching lead videos:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    return res.json({ success: true, videos: results });
  });
};

export const markVideoViewed = (req, res) => {
  const { videoId } = req.body;

  const sql = `UPDATE ele_customer_videos SET viewed_by_manager = 1 WHERE id = ?`;
  db.query(sql, [videoId], (err, result) => {
    if (err) {
      console.error("❌ Error marking viewed:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    return res.json({ success: true });
  });
};

export const deleteVideo = (req, res) => {
  const { id } = req.params;

  // Step 1: Get video path from DB
  const getSql = `SELECT video_path FROM ele_customer_videos WHERE id = ?`;
  db.query(getSql, [id], (err, results) => {
    if (err) {
      console.error("❌ DB Fetch Error:", err);
      return res.status(500).json({ success: false, message: "DB error" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    const videoPath = results[0].video_path;

    // Step 2: Delete file from uploads folder
    try {
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    } catch (fileErr) {
      console.error("⚠️ File delete error:", fileErr);
    }

    // Step 3: Delete record from DB
    const delSql = `DELETE FROM ele_customer_videos WHERE id = ?`;
    db.query(delSql, [id], (delErr) => {
      if (delErr) {
        console.error("❌ DB Delete Error:", delErr);
        return res
          .status(500)
          .json({ success: false, message: "DB delete failed" });
      }

      return res.json({ success: true, message: "Video deleted successfully" });
    });
  });
};
