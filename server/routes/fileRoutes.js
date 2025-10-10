const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");
// const auth = require("../middleware/auth"); // Commented out for testing

// TEMPORARY: Remove auth middleware to test
// Save converted file
router.post("/save-converted", fileController.saveConvertedFile);

// Get user files
router.get("/", fileController.getUserFiles);

// Delete file
router.delete("/:id", fileController.deleteFile);

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "File routes are working!" });
});

module.exports = router;
