// Import express
const express = require("express");

// Create an express app
const app = express();

// Middleware to parse JSON data
app.use(express.json());

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to Express.js Backend!");
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
