const express = require("express");
const router = express.Router();
const { sendOtp, verifyOtp, checkJwt, registerCustomer, verifyRegisterOtp} = require("../controllers/authController");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/check-jwt", checkJwt);
router.post("/register-customer", registerCustomer);
router.post("/verify-register-otp", verifyRegisterOtp);
module.exports = router;
