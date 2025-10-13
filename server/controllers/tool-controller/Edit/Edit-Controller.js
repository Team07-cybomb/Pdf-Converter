// controllers/tool-controller/Edit/Edit-Controller.js
const path = require("path");
const fs = require("fs").promises;
const { spawn } = require("child_process");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfParse = require("pdf-parse");

// ================================
// MAIN CONTROLLER CLASS
// ================================
class EditController {
  // Utility: Create a new session
  async createSession(fileBuffer, originalFileName) {
    const sessionId = `edit_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const sessionDir = path.join(__dirname, "../../../uploads/sessions", sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const originalFilePath = path.join(sessionDir, "original.pdf");
    await fs.writeFile(originalFilePath, fileBuffer);

    const pdfDoc = await PDFDocument.load(fileBuffer);
    const totalPages = pdfDoc.getPageCount();

    return { sessionId, originalFilePath, totalPages };
  }

  // ============================
  // Upload PDF
  // ============================
  async uploadPDF(req, res) {
    try {
      if (!req.file || req.file.mimetype !== "application/pdf") {
        return res
          .status(400)
          .json({ success: false, error: "Only PDF files are allowed" });
      }

      const { sessionId, totalPages } = await this.createSession(
        req.file.buffer,
        req.file.originalname
      );

      res.json({
        success: true,
        sessionId,
        totalPages,
        message: "PDF uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================
  // Convert (DOCX, PPTX, etc.) → PDF
  // ============================
  async convertAndUpload(req, res) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      const tempDir = path.join(__dirname, "../../../uploads/temp");
      await fs.mkdir(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, req.file.originalname);
      await fs.writeFile(tempFilePath, req.file.buffer);

      const libreOffice = new LibreOfficeService();
      const convertedFilePath = await libreOffice.convertToPDF(
        tempFilePath,
        tempDir
      );

      const convertedPdfBuffer = await fs.readFile(convertedFilePath);
      await fs.unlink(tempFilePath);
      await fs.unlink(convertedFilePath);

      const { sessionId, totalPages } = await this.createSession(
        convertedPdfBuffer,
        req.file.originalname
      );

      res.json({
        success: true,
        sessionId,
        totalPages,
        message: "File converted and uploaded successfully",
      });
    } catch (error) {
      console.error("Conversion and upload error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================
  // Extract Text from PDF
  // ============================
  async extractText(req, res) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID missing" });
      }

      const sessionDir = path.join(__dirname, "../../../uploads/sessions", sessionId);
      const pdfPath = path.join(sessionDir, "original.pdf");

      const fileBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(fileBuffer);

      res.json({ success: true, text: data.text.split("\n") });
    } catch (error) {
      console.error("Text extraction error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================
  // Extract Form Fields
  // ============================
  async extractFormFields(req, res) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID missing" });
      }

      const pdfPath = path.join(
        __dirname,
        "../../../uploads/sessions",
        sessionId,
        "original.pdf"
      );

      const fileBuffer = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const formFields = new PDFService().extractFormFields(pdfDoc);

      res.json({ success: true, formFields });
    } catch (error) {
      console.error("Form extraction error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================
  // Apply Edits to PDF
  // ============================
  async applyEdits(req, res) {
    try {
      const { sessionId, edits, formFields } = req.body;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID missing" });
      }

      const sessionDir = path.join(__dirname, "../../../uploads/sessions", sessionId);
      const inputPdfPath = path.join(sessionDir, "original.pdf");
      const outputPdfPath = path.join(sessionDir, "edited.pdf");

      const existingPdfBytes = await fs.readFile(inputPdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const pdfService = new PDFService();

      // Apply text, image, shape edits
      await pdfService.applyEdits(pdfDoc, edits, font);

      // Apply form field changes (with TT warning fix)
      pdfService.applyFormEdits(pdfDoc, formFields, font);

      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPdfPath, pdfBytes);

      res.json({
        success: true,
        message: "PDF edits applied successfully",
        filePath: outputPdfPath,
      });
    } catch (error) {
      console.error("Apply edits error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================
  // Download Edited PDF
  // ============================
  async downloadEdited(req, res) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return res.status(400).send("Session ID missing");
      }

      const filePath = path.join(
        __dirname,
        "../../../uploads/sessions",
        sessionId,
        "edited.pdf"
      );

      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        return res.status(404).send("Edited PDF not found");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=edited.pdf");
      res.sendFile(filePath);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).send(error.message);
    }
  }
}

// ================================
// SUPPORT SERVICES
// ================================
class LibreOfficeService {
  convertToPDF(inputPath, outputDir) {
    return new Promise((resolve, reject) => {
      const outputFilePath = path.join(
        outputDir,
        `${path.basename(inputPath, path.extname(inputPath))}.pdf`
      );
      const command = "soffice";
      const args = [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ];
      const child = spawn(command, args);

      child.on("error", (err) => {
        console.error("Failed to start LibreOffice process.", err);
        reject(
          new Error(
            "Failed to convert file. Is LibreOffice installed and in your PATH?"
          )
        );
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(outputFilePath);
        } else {
          reject(new Error(`LibreOffice conversion failed with exit code ${code}`));
        }
      });
    });
  }
}

class PDFService {
  extractFormFields(pdfDoc) {
    const formFields = [];
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      fields.forEach((field, index) => {
        formFields.push({
          id: `field_${index}`,
          name: field.getName() || `Field ${index + 1}`,
          type: field.constructor.name,
          value: field.getText ? field.getText() : "",
        });
      });
    } catch (formError) {
      console.log("No form fields found:", formError.message);
    }
    return formFields;
  }

  async applyEdits(pdfDoc, edits, font) {
    const pages = pdfDoc.getPages();
    if (!Array.isArray(edits)) return;

    for (const edit of edits) {
      if (edit.page && edit.page <= pages.length) {
        const page = pages[edit.page - 1];
        const pageHeight = page.getHeight();

        switch (edit.type) {
          case "add-text":
            page.drawText(edit.content || "", {
              x: edit.x || 50,
              y: pageHeight - (edit.y || 100),
              size: edit.fontSize || 12,
              font: font,
              color: this.hexToRgb(edit.color),
            });
            break;

          case "image":
          case "signature":
            if (edit.imageData) {
              try {
                const imageBytes = Buffer.from(edit.imageData.split(",")[1], "base64");
                let image;
                if (
                  edit.imageData.startsWith("data:image/jpeg") ||
                  edit.imageData.startsWith("data:image/jpg")
                ) {
                  image = await pdfDoc.embedJpg(imageBytes);
                } else if (edit.imageData.startsWith("data:image/png")) {
                  image = await pdfDoc.embedPng(imageBytes);
                }
                if (image) {
                  page.drawImage(image, {
                    x: edit.x || 100,
                    y: pageHeight - (edit.y || 100) - (edit.height || 150),
                    width: edit.width || 200,
                    height: edit.height || 150,
                  });
                }
              } catch (imgErr) {
                console.error("Error embedding image:", imgErr);
              }
            }
            break;

          case "highlight":
            page.drawRectangle({
              x: edit.path[0].x,
              y: pageHeight - edit.path[0].y - 20,
              width: edit.path[edit.path.length - 1].x - edit.path[0].x,
              height: 20,
              color: rgb(1, 1, 0),
              opacity: 0.5,
            });
            break;

          case "pen":
            const flattenedPath = edit.path.map((p) => [p.x, pageHeight - p.y]);
            if (flattenedPath.length >= 2) {
              page.drawSvgPath(this.getSvgPath(flattenedPath), {
                color: rgb(0, 0, 0),
                borderWidth: 2,
              });
            }
            break;

          case "square":
            page.drawRectangle({
              x: edit.path[0].x,
              y: pageHeight - edit.path[0].y - (edit.path[1].y - edit.path[0].y),
              width: edit.path[1].x - edit.path[0].x,
              height: edit.path[1].y - edit.path[0].y,
              borderColor: rgb(1, 0, 0),
              borderWidth: 2,
            });
            break;

          default:
            console.log("Unsupported edit type:", edit.type);
        }
      }
    }
  }

  applyFormEdits(pdfDoc, formFields, font) {
    if (!Array.isArray(formFields)) return;
    try {
      const form = pdfDoc.getForm();
      if (font) form.updateFieldAppearances(font);
      formFields.forEach((field) => {
        try {
          const formField = form.getField(field.name);
          if (formField && field.value) {
            formField.setText(field.value);
          }
        } catch (fieldError) {
          console.log(`Could not set field ${field.name}:`, fieldError.message);
        }
      });
    } catch (formError) {
      console.log("Form processing error:", formError.message);
    }
  }

  hexToRgb(hex) {
    if (!hex || hex === "#000000") return rgb(0, 0, 0);
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const bigint = parseInt(hex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return rgb(r, g, b);
  }

  getSvgPath(points) {
    if (!points || points.length < 2) return "";
    const start = points[0];
    const path = [`M ${start[0]} ${start[1]}`];
    for (let i = 1; i < points.length; i++) {
      path.push(`L ${points[i][0]} ${points[i][1]}`);
    }
    return path.join(" ");
  }
}

module.exports = new EditController();
