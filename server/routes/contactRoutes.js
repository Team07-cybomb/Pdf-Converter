const express = require("express");
const router = express.Router();
const { createContact, getAllContacts } = require("../controllers/contactController");

// POST new contact
router.post("/", createContact);

// GET all contacts (for admin)
router.get("/", getAllContacts);

module.exports = router;
