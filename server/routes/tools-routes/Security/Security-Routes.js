// server/routes/tools-routes/Security/Security-Routes.js

const express = require('express');
const router = express.Router();
const securityController = require('../../../controllers/tool-controller/Security/Security-Controller');

// File Encryption/Decryption
router.post('/encrypt', securityController.encryptFile);
router.post('/decrypt', securityController.decryptFile);

// 2FA Protected PDF
router.post('/protect-pdf-2fa', securityController.protectPDFWith2FA);
router.post('/access-pdf-2fa', securityController.access2FAProtectedPDF);
router.get('/list-2fa-files', securityController.list2FAProtectedFiles);
router.delete('/remove-2fa-file', securityController.remove2FAProtectedFile);

// File Sharing with Access Control
router.post('/share-file', securityController.shareFileWithAccess);
router.post('/add-user-access', securityController.addUserToFileAccess);
router.post('/access-shared-file', securityController.accessSharedFile);
router.get('/file-access-list', securityController.getFileAccessList);
router.get('/list-shared-files', securityController.listSharedFiles);

module.exports = router;