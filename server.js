// import express from "express";
// import cors from "cors";
// import categoryRoutes from "./routes/categoryRoutes.js";
// import auth from "./routes/auth.js";
// import managerAuthRoutes from "./routes/managerAuthRoutes.js";
// import videoRoutes from "./routes/videoRoutes.js";
// import locationRoutes from "./routes/locationRoutes.js";
// import path from "path";
// import { fileURLToPath } from "url";
// import { Server } from "socket.io";
// import http from "http";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();
// const server = http.createServer(app); // ✅ HTTP server for socket.io

// // ✅ Attach socket.io
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Use Routes
// app.use("/api", categoryRoutes);
// app.use("/api", auth);
// app.use("/api", managerAuthRoutes);
// app.use("/api/videos", videoRoutes);
// app.use("/api", locationRoutes);

// // Serve static videos
// app.use(
//   "/uploads/videos",
//   express.static(path.join(process.cwd(), "uploads/videos"), {
//     setHeaders: (res, filePath) => {
//       if (filePath.endsWith(".mp4")) {
//         res.setHeader("Content-Type", "video/mp4");
//       }
//     },
//   })
// );

// // ✅ Socket.IO handling
// io.on("connection", (socket) => {
//   console.log("🔥 Client connected:", socket.id);

//   // When client registers itself
//   socket.on("register", (data) => {
//     console.log("Registered:", data);
//     socket.join(data.type); // e.g. join "customer" or "manager"
//   });

//   // When customer sends location update
//   socket.on("location:update", (payload) => {
//     console.log("📍 Location from customer:", payload);

//     // Send to all managers
//     io.to("manager").emit("location:customer", payload);
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ Client disconnected:", socket.id);
//   });
// });

// // Run server
// const PORT = 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });











import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/categoryRoutes.js";
import auth from "./routes/auth.js";
import managerAuthRoutes from "./routes/managerAuthRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
// import eleCrm from "./routes/eleCrm.js";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ✅ Allow all origins for testing — you can restrict later if needed
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ API Routes
app.use("/api", categoryRoutes);
app.use("/api", auth);
app.use("/api", managerAuthRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api", locationRoutes);
// app.use("/api", eleCrm);
// ✅ Serve uploaded video files
app.use(
  "/uploads/videos",
  express.static(path.join(process.cwd(), "uploads/videos"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
      }
    },
  })
);
// ⭐ Serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ Socket.IO setup
io.on("connection", (socket) => {
  console.log("🔥 Client connected:", socket.id);

  // Client registers (e.g. manager or customer)
  socket.on("register", (data) => {
    console.log("Registered:", data);
    socket.join(data.type); // e.g. "customer" or "manager"
  });

  // Customer sends live location update
  socket.on("location:update", (payload) => {
    console.log("📍 Location update:", payload);

    // Send to all connected managers
    io.to("manager").emit("location:customer", payload);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ✅ Default route
app.get("/", (req, res) => {
  res.send("🚀 Premove Backend is running successfully!");
});

// ✅ Use Render's dynamic port or fallback to 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

