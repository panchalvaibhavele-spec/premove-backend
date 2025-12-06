// import express from "express";
// import {
//   getCategories,
//   getAllItems,
//   // getSubCategoryItems,
//   getInventoryByLead,
//   getSubCategoryItem,
//   getCustomerLeads,
//   getLeadById,
//   getCustomerInventory,
//   addInventory,
//   createLead,
//   saveInventory,
//   getHomeTypes,
//   getSubCategoryItemInventory,
//   getProfile,
//   updateProfile,
//   submitFeedback,
//   getFeedbackByPhone,
//   getSubCategories,
//   getSubCategoryItems,
//   scheduleVisit,
//   getTrackingData,
//   getVisitStatus,
//   checkVisit,
//   managerAcceptVisit,
//   managerRescheduleVisit,
//   customerAcceptReschedule,
//   customerRescheduleVisit,
// } from "../controllers/categoryController.js";

// const router = express.Router();

// router.get("/categories", getCategories);
// router.get("/all-items", getAllItems);
// // router.get("/sub-category-items/:sub_category_id", getSubCategoryItems);
// router.get("/inventory/:lead_unique_id", getInventoryByLead);
// router.get("/sub-category-item/:id", getSubCategoryItem);
// router.get("/sub-category-iteminventory/:id", getSubCategoryItemInventory);
// router.get("/customer/leads/:phone", getCustomerLeads);
// // ✅ Lead & Inventory Routes
// router.get("/leads/:id", getLeadById);
// // router.get("/inventory/:lead_id", getCustomerInventory);
// router.get("/customer-inventory/:leadId", getCustomerInventory);
// router.post("/add-inventory", addInventory);
// router.get("/home-types", getHomeTypes);
// router.post("/create-lead", createLead);
// router.post("/save-inventory", saveInventory);

// router.get("/profile/:phone", getProfile);
// router.post("/profile/update/:phone", updateProfile);
// router.post("/feedback", submitFeedback);
// router.get("/feedback/:phone", getFeedbackByPhone);
// router.get("/sub-categories/:categoryId", getSubCategories); // ✅ level 2
// router.get("/sub-category-items/:subCategoryId", getSubCategoryItems); 
// router.post('/schedule-visite', scheduleVisit);
// router.get('/tracking/:visitRequestId', getTrackingData);
// router.get('/customer-visit-status/:leadId', getVisitStatus);
// router.post('/check-visit', checkVisit);


// // ================
// // =======================
// // VISIT MANAGEMENT ROUTES
// // =======================

// // Manager: Get today's visit requests
// // router.get("/manager/today-visit-requests", getTodayVisitRequests);

// // Manager: Accept visit request
// router.post("/manager/visit/accept", managerAcceptVisit);

// // Manager: Reschedule visit
// router.post("/manager/visit/reschedule", managerRescheduleVisit);


// // Customer: Accept manager's reschedule proposal
// router.post("/customer/visit/accept", customerAcceptReschedule);

// // Customer: Reschedule again
// router.post("/customer/visit/reschedule", customerRescheduleVisit);


// export default router;
 





import express from "express";
import multer from "multer";

import {
  getCategories,
  getAllItems,
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
  updateProfile,            // JSON update
  updateProfileImage,       // NEW image upload controller
  submitFeedback,
  getFeedbackByPhone,
  getSubCategories,
  getSubCategoryItems,
  scheduleVisit,
  getTrackingData,
  getVisitStatus,
  checkVisit,
  managerAcceptVisit,
  managerRescheduleVisit,
  customerAcceptReschedule,
  customerRescheduleVisit,
  getLeads,
  getLeadCount,
} from "../controllers/categoryController.js";

const router = express.Router();

/* ===========================
      MULTER FOR IMAGE UPLOAD
   =========================== */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure uploads/ folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });



/* ===========================
          API ROUTES
   =========================== */

// 📦 Categories
router.get("/categories", getCategories);
router.get("/all-items", getAllItems);

// 📦 Lead Inventory
router.get("/inventory/:lead_unique_id", getInventoryByLead);
router.get("/sub-category-item/:id", getSubCategoryItem);
router.get("/sub-category-iteminventory/:id", getSubCategoryItemInventory);
router.get("/customer/leads/:phone", getCustomerLeads);

// 📦 Leads
router.get("/leads/:id", getLeadById);
router.get("/customer-inventory/:leadId", getCustomerInventory);
router.post("/add-inventory", addInventory);
router.get("/home-types", getHomeTypes);
router.post("/create-lead", createLead);
router.post("/save-inventory", saveInventory);

// 👤 Profile
router.get("/profile/:phone", getProfile);              // get profile
router.post("/profile/update/:phone", updateProfile);   // update name + email (JSON)
router.post(
  "/profile/update-image/:phone",
  upload.single("profile_image"),
  updateProfileImage                                     // NEW image upload route
);

// ⭐ Feedback
router.post("/feedback", submitFeedback);
router.get("/feedback/:phone", getFeedbackByPhone);

// ⭐ Categories Nested
router.get("/sub-categories/:categoryId", getSubCategories);
router.get("/sub-category-items/:subCategoryId", getSubCategoryItems);

// ⭐ Scheduling + Tracking
router.post("/schedule-visite", scheduleVisit);
router.get("/tracking/:visitRequestId", getTrackingData);
router.get("/customer-visit-status/:leadId", getVisitStatus);
router.post("/check-visit", checkVisit);

// ⭐ Visit Flow
router.post("/manager/visit/accept", managerAcceptVisit);
router.post("/manager/visit/reschedule", managerRescheduleVisit);
router.post("/customer/visit/accept", customerAcceptReschedule);
router.post("/customer/visit/reschedule", customerRescheduleVisit);



// routes for elecrm
router.get("/leads", getLeads);
router.get("/leads/count", getLeadCount);

export default router;
