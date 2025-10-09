const express = require('express');
const router = express.Router();
const EditController = require('../../../controllers/tool-controller/Edit/Edit-Controller');

// PDF Editor Routes
router.post('/pdf-editor', EditController.processPDFEditor);
router.get('/pdf-editor/download/:filename', EditController.downloadPDFEditor);

// E-Signature Routes
router.post('/esignature', EditController.createESignature);
router.get('/esignature/download/:filename', EditController.downloadESignature);

module.exports = router;