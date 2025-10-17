import express from "express";
import {
  getCategories,
  getAllItems,
  // getSubCategoryItems,
  getInventoryByLead,
  getSubCategoryItem,
  getCustomerLeads,
  getLeadById,
  getCustomerInventory,
  addInventory,
  createLead,
  saveInventory,
  getHomeTypes,
  getSubCategoryItemInventory,
  getProfile,
  updateProfile,
  submitFeedback,
  getFeedbackByPhone,
  getSubCategories,
  getSubCategoryItems,
  scheduleVisit,
  getTrackingData,
  getVisitStatus,
  checkVisit,
} from "../controllers/categoryController.js";

const router = express.Router();

router.get("/categories", getCategories);
router.get("/all-items", getAllItems);
// router.get("/sub-category-items/:sub_category_id", getSubCategoryItems);
router.get("/inventory/:lead_unique_id", getInventoryByLead);
router.get("/sub-category-item/:id", getSubCategoryItem);
router.get("/sub-category-iteminventory/:id", getSubCategoryItemInventory);
router.get("/customer/leads/:phone", getCustomerLeads);
// ✅ Lead & Inventory Routes
router.get("/leads/:id", getLeadById);
// router.get("/inventory/:lead_id", getCustomerInventory);
router.get("/customer-inventory/:leadId", getCustomerInventory);
router.post("/add-inventory", addInventory);
router.get("/home-types", getHomeTypes);
router.post("/create-lead", createLead);
router.post("/save-inventory", saveInventory);

router.get("/profile/:phone", getProfile);
router.post("/profile/update/:phone", updateProfile);
router.post("/feedback", submitFeedback);
router.get("/feedback/:phone", getFeedbackByPhone);
router.get("/sub-categories/:categoryId", getSubCategories); // ✅ level 2
router.get("/sub-category-items/:subCategoryId", getSubCategoryItems); 
router.post('/schedule-visite', scheduleVisit);
router.get('/tracking/:visitRequestId', getTrackingData);
router.get('/customer-visit-status/:leadId', getVisitStatus);
router.post('/check-visit', checkVisit);
export default router;
 