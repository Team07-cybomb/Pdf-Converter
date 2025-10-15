// routes/tools-routes/Edit/Edit-Route.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const EditController = require('../../../controllers/tool-controller/Edit/Edit-Controller');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Edit routes are working'
  });
});

// Upload PDF and extract structure
router.post('/upload', upload.single('pdfFile'), EditController.uploadPDF);


// Get PDF structure
router.get('/structure/:sessionId', EditController.getStructure);

// Update text content
router.post('/update-text', EditController.updateText);

// Get saved edits
router.post('/get-edits', EditController.getEdits); // Add this line

// Export PDF
router.post('/export', EditController.exportPDF);

// Apply edits
router.post('/apply-edits', EditController.applyEdits);

// Download edited PDF
router.get('/download/:sessionId', EditController.downloadEdited);

// Serve background images
router.get('/background/:sessionId/page-:pageNum.png', EditController.serveBackgroundImage);

// Serve images
router.get('/images/:sessionId/page-:pageNum/:imageId', EditController.serveImage);

module.exports = router;