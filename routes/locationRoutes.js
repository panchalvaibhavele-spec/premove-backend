// routes/locationRoutes.js
import express from "express";
import { saveLocation, getLocation } from "../controllers/locationController.js";

const router = express.Router();

// POST -> save customer location
router.post("/location", saveLocation);

// GET -> get customer latest location
router.get("/location/:customerId", getLocation);

export default router;
