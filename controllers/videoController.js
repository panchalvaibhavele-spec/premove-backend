import db from "../config/db.js";
import path from "path";
import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";
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

export const saveCustomerVideo = (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No video uploaded" });
  }

  const { lead_id, cus_number } = req.body;

  // Original path
  const inputPath = req.file.path;

  // Compressed output path
  const outputFilename = Date.now() + "-compressed.mp4";
  const outputPath = path.join("uploads/videos/", outputFilename);

  // 🔥 Compress video to MP4 (H.264 codec, 360p)
  Ffmpeg(inputPath)
    .outputOptions([
      "-c:v libx264", // video codec
      "-preset veryfast", // compression speed/quality tradeoff
      "-crf 28", // quality (lower = better, 28 ~ 360p-480p good size)
      "-vf scale=640:-2", // resize width=640px, height auto (approx 360p)
      "-c:a aac", // audio codec
      "-b:a 128k", // audio bitrate
    ])
    .save(outputPath)
    .on("end", () => {
      // Delete original big file
      fs.unlinkSync(inputPath);

      // Save to DB
      const sql = `
        INSERT INTO ele_customer_videos (lead_id, cus_number, video_path)
        VALUES (?, ?, ?)
      `;
      db.query(sql, [lead_id, cus_number, outputPath], (err, result) => {
        if (err) {
          console.error("❌ DB Insert Error:", err);
          return res.status(500).json({ success: false, message: "DB error" });
        }
        return res.json({
          success: true,
          message: "Video uploaded & compressed successfully",
          video_path: outputPath,
        });
      });
    })
    .on("error", (err) => {
      console.error("❌ Compression error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Video compression failed" });
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
