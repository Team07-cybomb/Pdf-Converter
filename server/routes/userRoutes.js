const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getAllUsers } = require("../controllers/userController");
const { verifyAdmin } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected admin route
router.get("/users", verifyAdmin, getAllUsers);

module.exports = router;
