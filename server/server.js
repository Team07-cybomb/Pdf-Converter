const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");
const convertRoutes = require("./routes/tools-routes/Convert/Convert-Routes");
const OrganizeRoutes = require('./routes/tools-routes/Organize/Organize-Route');
const SecurityRoutes = require('./routes/tools-routes/Security/Security-Routes');
const EditRoutes = require('./routes/tools-routes/Edit/Edit-Route');

const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS setup
app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/convert", convertRoutes);

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/organize', OrganizeRoutes);
app.use('/api/security', SecurityRoutes);

// Apply multer to file-rename route
app.use('/api/edit', (req, res, next) => {
  if (req.path === '/file-rename' && req.method === 'POST') {
    upload.array('files')(req, res, next);
  } else {
    next();
  }
}, EditRoutes);

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
