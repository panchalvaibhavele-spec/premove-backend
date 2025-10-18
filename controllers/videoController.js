import db from "../config/db.js";
import path from "path";
import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";

// ✅ Ensure uploads folder exists
const uploadDir = path.join("uploads/videos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ===============================
// ✅ Save & Compress Customer Video
// ===============================
export const saveCustomerVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video uploaded" });
    }

    const { lead_id, cus_number } = req.body;
    if (!lead_id || !cus_number) {
      return res.status(400).json({
        success: false,
        message: "Missing lead_id or cus_number",
      });
    }

    const inputPath = req.file.path;
    const outputFilename = `${Date.now()}-compressed.mp4`;
    const outputPath = path.join(uploadDir, outputFilename);
    const dbPath = `/uploads/videos/${outputFilename}`; // for frontend

    console.log("🎥 Compressing video:", inputPath);

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
      .on("end", async () => {
        console.log("✅ Compression complete:", outputFilename);

        // Safely delete original
        try {
          fs.unlinkSync(inputPath);
        } catch (e) {
          console.warn("⚠️ Could not delete original:", e.message);
        }

        // Save to DB
        const sql = `
          INSERT INTO ele_customer_videos (lead_id, cus_number, video_path)
          VALUES (?, ?, ?)
        `;
        await db.promise().query(sql, [lead_id, cus_number, dbPath]);

        return res.json({
          success: true,
          message: "Video uploaded & compressed successfully",
          video_path: dbPath,
        });
      })
      .on("error", (err) => {
        console.error("❌ Compression error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Video compression failed" });
      });
  } catch (error) {
    console.error("❌ Exception:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// ✅ Get videos by manager (based on assign_location)
// ===============================
export const getManagerVideos = async (req, res) => {
  try {
    const { managerId } = req.params;
    if (!managerId)
      return res.status(400).json({ success: false, message: "Missing managerId" });

    const sql = `
      SELECT v.id, v.video_path, v.uploaded_at,
             l.cust_name, l.cust_mobile, l.city_name
      FROM ele_customer_videos v
      JOIN ele_customer_lead l ON v.lead_id = l.id
      JOIN ele_customer_manager m ON m.id = ?
      WHERE l.city_name = m.assign_location
      ORDER BY v.uploaded_at DESC
    `;

    const [videos] = await db.promise().query(sql, [managerId]);
    return res.json({ success: true, videos });
  } catch (err) {
    console.error("❌ Error fetching manager videos:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// ✅ Get videos by Lead ID
// ===============================
export const getLeadVideos = async (req, res) => {
  try {
    const { leadId } = req.params;
    if (!leadId)
      return res.status(400).json({ success: false, message: "Missing leadId" });

    const sql = `
      SELECT v.id, v.video_path, v.uploaded_at, v.viewed_by_manager,
             l.cust_name, l.cust_mobile, l.city_name
      FROM ele_customer_videos v
      JOIN ele_customer_lead l ON v.lead_id = l.id
      WHERE v.lead_id = ?
      ORDER BY v.uploaded_at DESC
    `;

    const [videos] = await db.promise().query(sql, [leadId]);
    return res.json({ success: true, videos });
  } catch (err) {
    console.error("❌ Error fetching lead videos:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// ✅ Mark video as viewed by manager
// ===============================
export const markVideoViewed = async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId)
      return res.status(400).json({ success: false, message: "Missing videoId" });

    const sql = `UPDATE ele_customer_videos SET viewed_by_manager = 1 WHERE id = ?`;
    await db.promise().query(sql, [videoId]);

    return res.json({ success: true, message: "Video marked as viewed" });
  } catch (err) {
    console.error("❌ Error marking viewed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
