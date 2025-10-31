import express from "express";
import multer from "multer";
import path from "path";
import { deleteVideo, getLeadVideos, getManagerVideos, markVideoViewed, saveCustomerVideo } from "../controllers/videoController.js";

const router = express.Router();

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/videos/"); // local uploads folder
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_")
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".mp4" || ext === ".mov" || ext === ".avi" || ext === ".mkv") {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed!"));
    }
  },
});

// POST /api/videos/upload
router.post("/upload", upload.single("video"), saveCustomerVideo);
// GET /api/videos/manager-videos/:managerId
router.get("/manager-videos/:managerId", getManagerVideos);

// Lead videos by manager
router.get("/lead-videos/:leadId/:managerId", getLeadVideos);

// Mark video as viewed
router.post("/mark-viewed", markVideoViewed);
router.delete("/:id", deleteVideo);
export default router;
