// routes/tools-routes/Edit/Edit-Route.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// FIXED: Ensure correct path to controller
const EditController = require('../../../controllers/tool-controller/Edit/Edit-Controller');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});
// In Edit-Route.js, add a test route:
router.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ 
    success: true, 
    message: 'Edit routes are working',
    controllerMethods: Object.keys(EditController).filter(key => typeof EditController[key] === 'function')
  });
});
// Upload PDF and extract structure
router.post('/upload', upload.single('pdfFile'), async (req, res) => {
  try {
    // FIXED: Directly call the method on the imported instance
    await EditController.uploadPDF(req, res);
  } catch (err) {
    console.error('Upload PDF error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload PDF', 
      error: err.message 
    });
  }
});
router.get('/structure/:sessionId', EditController.getStructure);
router.post('/update-text', EditController.updateText);
router.post('/export', EditController.exportPDF);
router.post('/apply-edits', EditController.applyEdits); // ADDED
router.get('/download/:sessionId', EditController.downloadEdited); // ADDED
router.get('/images/:sessionId/page-:pageNum/:imageId', EditController.serveImage);

module.exports = router;