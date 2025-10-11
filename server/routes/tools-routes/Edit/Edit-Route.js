// routes/tools-routes/Edit/Edit-Route.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const EditController = require("../../../controllers/tool-controller/Edit/Edit-Controller");

// ✅ Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// ✅ Routes

// Upload a PDF
router.post("/upload", upload.single("pdfFile"), async (req, res) => {
  try {
    await EditController.uploadPDF(req, res);
  } catch (err) {
    console.error("Upload PDF error:", err);
    res.status(500).json({ message: "Failed to upload PDF", error: err.message });
  }
});

// Convert any file to PDF and upload
router.post("/convert-to-pdf", upload.single("pdfFile"), async (req, res) => {
  try {
    await EditController.convertAndUpload(req, res);
  } catch (err) {
    console.error("Convert-to-PDF error:", err);
    res.status(500).json({ message: "Conversion failed", error: err.message });
  }
});

// Extract text from PDF
router.post("/extract-text", async (req, res) => {
  try {
    await EditController.extractText(req, res);
  } catch (err) {
    console.error("Extract text error:", err);
    res.status(500).json({ message: "Text extraction failed", error: err.message });
  }
});

// ✅ Extract form fields from PDF (fixed function name)
router.get("/extract-forms/:sessionId", async (req, res) => {
  try {
    await EditController.extractFormFields(req, res);
  } catch (err) {
    console.error("Extract form fields error:", err);
    res.status(500).json({ message: "Form extraction failed", error: err.message });
  }
});

// Apply user edits and save session
router.post("/apply-edits", async (req, res) => {
  try {
    await EditController.applyEdits(req, res);
  } catch (err) {
    console.error("Apply edits error:", err);
    res.status(500).json({ message: "Failed to apply edits", error: err.message });
  }
});

// Download the edited PDF
router.get("/download/:sessionId", async (req, res) => {
  try {
    await EditController.downloadEdited(req, res);
  } catch (err) {
    console.error("Download edited PDF error:", err);
    res.status(500).json({ message: "Failed to download PDF", error: err.message });
  }
});

module.exports = router;
