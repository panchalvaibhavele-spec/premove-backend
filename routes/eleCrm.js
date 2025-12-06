import express from "express";
import { getLeadById, getLeads } from "../controllers/eleCrm";


const router = express.Router();

router.get("/leads", getLeads);
router.get("/leads/:id", getLeadById);

export default router;
