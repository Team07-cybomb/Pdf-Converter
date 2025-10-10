// routes/tools-routes/Edit/Edit-Route.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const EditController = require('../../../controllers/tool-controller/Edit/Edit-Controller');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for larger files
  }
});

// Routes
router.post('/upload', upload.single('pdfFile'), (req, res) => {
  EditController.uploadPDF(req, res);
});

router.post('/convert-to-pdf', upload.single('pdfFile'), (req, res) => {
  EditController.convertAndUpload(req, res);
});

router.get('/extract-text/:sessionId', (req, res) => {
  EditController.extractText(req, res);
});

router.get('/extract-forms/:sessionId', (req, res) => {
  EditController.extractFormFields(req, res);
});

router.post('/apply-edits', (req, res) => {
  EditController.applyEdits(req, res);
});

router.get('/download/:sessionId', (req, res) => {
  EditController.downloadEditedPDF(req, res);
});

module.exports = router;