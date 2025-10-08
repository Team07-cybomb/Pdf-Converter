const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getAllUsers,
  forgotPassword,
  resetPassword,
} = require("../controllers/userController");
const { verifyAdmin } = require("../middleware/authMiddleware");

// Public routes for user authentication
router.post("/register", registerUser);
router.post("/login", loginUser);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected admin route
router.get("/users", verifyAdmin, getAllUsers);

module.exports = router;