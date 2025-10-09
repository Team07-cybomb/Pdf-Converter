const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  convertToPdf,
  convertPdfToImage,
  convertImageToPdf,
  downloadConvertedFile,
  getConversionStatus,
} = require("../../../controllers/tool-controller/Convert/Convert-Controller");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../../uploads/temp");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for "Convert PDF" tool - accepts multiple formats to convert TO PDF
const convertToPdfFileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".pptx",
    ".ppt",
    ".jpg",
    ".jpeg",
    ".png",
  ];

  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only Word, Excel, PowerPoint, and Image files are allowed for this tool"
      ),
      false
    );
  }
};

// File filter for PDF-only endpoints
const pdfFileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (fileExt === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed for this tool"), false);
  }
};

// File filter for image-only endpoints
const imageFileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png"];

  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPG, JPEG, and PNG files are allowed for this tool"),
      false
    );
  }
};

// Create different upload configurations
const uploadToPdf = multer({
  storage: storage,
  fileFilter: convertToPdfFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

const uploadImage = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Routes with appropriate file type handling
router.post("/to-pdf", uploadToPdf.single("file"), convertToPdf);
router.post("/pdf-to-image", uploadPdf.single("file"), convertPdfToImage);
router.post("/image-to-pdf", uploadImage.single("file"), convertImageToPdf);
router.get("/download/:conversionId", downloadConvertedFile);
router.get("/status/:conversionId", getConversionStatus);

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        details: "File size must be less than 50MB",
      });
    }
    if (error.code === "Unexpected field") {
      return res.status(400).json({
        error: "Invalid field name",
        details: "Please check the file upload field name",
      });
    }
  }
  res.status(500).json({ error: "Upload failed", details: error.message });
});

module.exports = router;
