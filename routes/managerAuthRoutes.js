import express from "express";
import {
  managerSendOtp,
  managerVerifyOtp,
  managerCheckJwt,
  authMiddleware,
  getManagerCustomers,
  getCustomerInventory,
  getCustomerDetails,
  getDashboardCustomersBySpanco,
  getCustomerLeads,
  getLeadInventory,
  updateManagerDetails,
  getMangerDetails,
  getVisitRequests,
  getCustomerLocation,
  sendVisitOtp,
  verifyVisitOtp,
  updateManagerLocation,
  getManagerLocation,
  createVisitRequest,
  startVisitRequest,
  getTodayVisitRequests,
  getManagerLocationfontlead,
  getManagerAllLeads,
  getInventorySummary,
} from "../controllers/managerAuthController.js";

const router = express.Router();

// Manager OTP routes
router.post("/manager/send-otp", managerSendOtp);
router.post("/manager/verify-otp", managerVerifyOtp);
router.get("/manager/check-jwt", managerCheckJwt);
router.get("/manager/dashboard/customers", getDashboardCustomersBySpanco);
router.get("/manager/customers", authMiddleware, getManagerCustomers);
router.get(
  "/manager/customers/:customerId/inventory",
  authMiddleware,
  getCustomerInventory
);

router.get(
  "/manager/customers/:mobile/leads",
  authMiddleware,
  getCustomerLeads
);

// 📦 Lead Inventory (new)
router.get(
  "/manager/leads/:leadId/inventory",
  authMiddleware,
  getLeadInventory
);

router.get(
  "/manager/customers/:customerId",
  authMiddleware,
  getCustomerDetails
);

router.get("/manager/details/:phone", getMangerDetails);

router.put("/manager/details/:phone", updateManagerDetails);
router.get("/manager/visit-requests", getVisitRequests);
router.get("/customer/:id", getCustomerLocation);

router.post("/visit-request/send-otp", sendVisitOtp);

// 🔑 Verify OTP and complete visit
router.post("/visit-request/verify-otp", verifyVisitOtp);
router.post("/manager/update-location", updateManagerLocation);
router.post("/visit-request/create", createVisitRequest);
router.get("/manager/location/:managerId", getManagerLocation);
router.post("/visit-request/start", startVisitRequest);
router.get("/manager/today-visit-requests", getTodayVisitRequests);
// all leads
router.get('/manager-location', getManagerLocationfontlead);
router.get("/manager-leads", getManagerAllLeads);
router.get("/inventory-summary", getInventorySummary);

export default router;
