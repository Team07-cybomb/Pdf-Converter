const express = require("express");
const router = express.Router();
const { loginAdmin, getAllAdmins } = require("../controllers/adminController");
const { verifyToken } = require("../middleware/authMiddleware");

// Admin login
router.post("/login", loginAdmin);

// Protected route example (optional)
router.get("/", verifyToken, getAllAdmins);

module.exports = router;
