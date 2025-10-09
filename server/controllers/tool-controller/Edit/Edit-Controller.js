const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const baseDir = path.join(__dirname, '../../../uploads');
  const dirs = [
    'text',
    'esignature',
    'temp'
  ];
  
  dirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

ensureUploadDirs();

const EditController = {

  // PDF Editor Functions
  async processPDFEditor(req, res) {
    try {
      console.log('PDF Editor Request received');
      const { pdfFile, annotations, annotationData, filename = 'edited-document' } = req.body;
      
      if (!annotationData) {
        return res.status(400).json({ error: 'Annotation data is required' });
      }

      // Remove data URL prefix
      const base64Data = annotationData.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      const safeFilename = `${filename}-${Date.now()}.pdf`;
      
      // Create PDF in memory (no file system storage)
      const doc = new PDFDocument();
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        
        // Send PDF directly to client without saving
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Length', pdfData.length);
        
        res.json({
          success: true,
          message: 'PDF processed successfully',
          filename: safeFilename,
          pdfData: pdfData.toString('base64'),
          annotationsCount: annotations ? annotations.length : 0
        });
      });
      
      // Add annotation image to PDF
      doc.image(imageBuffer, {
        fit: [500, 700],
        align: 'center',
        valign: 'center'
      });
      
      // Add metadata
      doc.info.Title = `Edited PDF - ${filename}`;
      doc.info.Author = 'PDF Editor';
      doc.info.CreationDate = new Date();
      
      doc.end();
      
    } catch (error) {
      console.error('PDF Editor error:', error);
      res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
    }
  },

  async downloadPDFEditor(req, res) {
    try {
      const { filename } = req.params;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Create a simple PDF for download
      const doc = new PDFDocument();
      doc.pipe(res);
      doc.fontSize(20).text('Edited PDF Document', 100, 100);
      doc.text(`Filename: ${filename}`, 100, 150);
      doc.text('This PDF was edited using the PDF Editor tool', 100, 200);
      doc.end();
      
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  },

  // E-Signature Functions
  async createESignature(req, res) {
    try {
      console.log('E-Signature Request received:', req.body);
      const { name, style = 'standard' } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required for signature' });
      }

      // Create signature image
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(400, 200);
      const ctx = canvas.getContext('2d');
      
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 200);
      
      // Signature style
      if (style === 'cursive') {
        ctx.font = 'italic 36px Arial';
        ctx.fillStyle = 'blue';
      } else if (style === 'formal') {
        ctx.font = 'bold 32px Times New Roman';
        ctx.fillStyle = 'black';
      } else {
        ctx.font = '32px Arial';
        ctx.fillStyle = 'darkblue';
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 200, 100);
      
      // Add signature line
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 150);
      ctx.lineTo(350, 150);
      ctx.stroke();
      
      const signatureBuffer = canvas.toBuffer('image/png');
      const filename = `signature-${Date.now()}.png`;
      const filePath = path.join(__dirname, '../../../uploads/esignature', filename);
      
      fs.writeFileSync(filePath, signatureBuffer);
      
      console.log('E-Signature created:', filename);
      
      res.json({
        success: true,
        message: 'E-Signature created successfully',
        filename: filename,
        downloadUrl: `/api/edit/esignature/download/${filename}`
      });
    } catch (error) {
      console.error('E-Signature error:', error);
      res.status(500).json({ error: 'Failed to create e-signature: ' + error.message });
    }
  },

  async downloadESignature(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../../uploads/esignature', filename);
      
      console.log('Download E-Signature:', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'image/png');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Download failed' });
    }
  }
};

module.exports = EditController;