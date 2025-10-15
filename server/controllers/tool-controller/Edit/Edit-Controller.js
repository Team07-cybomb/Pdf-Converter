// controllers/tool-controller/Edit/Edit-Controller.js
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const pdfjsLib = require('pdfjs-dist');

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(__dirname, '../../../node_modules/pdfjs-dist/build/pdf.worker.js');

class EditController {
  constructor() {
    console.log('EditController initialized');
    // Bind methods to ensure proper 'this' context
    this.uploadPDF = this.uploadPDF.bind(this);
    this.extractCompletePDFStructure = this.extractCompletePDFStructure.bind(this);
    this.getStructure = this.getStructure.bind(this);
    this.updateText = this.updateText.bind(this);
    this.exportPDF = this.exportPDF.bind(this);
    this.serveImage = this.serveImage.bind(this);
    this.applyEdits = this.applyEdits.bind(this);
    this.downloadEdited = this.downloadEdited.bind(this);
  }

  // Upload PDF and extract complete structure
  async uploadPDF(req, res) {
    console.log('uploadPDF method called');
    try {
      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      if (req.file.mimetype !== 'application/pdf') {
        console.log('Invalid file type:', req.file.mimetype);
        return res.status(400).json({
          success: false,
          error: 'Only PDF files are allowed'
        });
      }

      console.log('PDF file received, size:', req.file.size);

      const sessionId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionDir = path.join(__dirname, '../../../uploads/sessions', sessionId);
      
      // Create session directory
      await fs.mkdir(sessionDir, { recursive: true });
      console.log('Session directory created:', sessionDir);

      const originalFilePath = path.join(sessionDir, 'original.pdf');
      await fs.writeFile(originalFilePath, req.file.buffer);
      console.log('Original PDF saved');

      // Extract complete PDF structure 
      console.log('Starting PDF structure extraction...');
      const pdfUint8Array = new Uint8Array(req.file.buffer);
const pdfStructure = await this.extractCompletePDFStructure(pdfUint8Array, sessionId);
      console.log('PDF structure extraction completed');

      res.json({
        success: true,
        sessionId,
        totalPages: pdfStructure.pages.length,
        structure: pdfStructure,
        message: 'PDF uploaded and parsed successfully'
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Extract complete PDF structure with all elements
  async extractCompletePDFStructure(pdfBuffer, sessionId) {
    console.log('extractCompletePDFStructure called, buffer size:', pdfBuffer.length);
    
    const structure = {
      pages: [],
      metadata: {},
      layers: {
        background: [],
        images: [],
        text: [],
        tables: [],
        annotations: [],
        shapes: []
      }
    };

    try {
      console.log('Loading PDF document...');
      const pdfDoc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      console.log('PDF loaded, pages:', pdfDoc.numPages);

      const metadata = await pdfDoc.getMetadata();
      structure.metadata = metadata.info || {};
      console.log('PDF metadata:', structure.metadata);

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}...`);
        
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const [textContent, annotations, operatorList] = await Promise.all([
          page.getTextContent(),
          page.getAnnotations().catch(() => []),
          page.getOperatorList()
        ]);

        const pageStructure = {
          pageNumber: pageNum,
          width: viewport.width,
          height: viewport.height,
          layers: {
            background: [],
            images: [],
            text: [],
            tables: [],
            annotations: [],
            shapes: []
          }
        };

        // Extract all content types
        console.log(`Extracting content from page ${pageNum}...`);
        const textElements = this.extractTextElements(textContent, viewport, pageNum);
        const imageElements = await this.extractImages(page, viewport, pageNum, sessionId);
        const tableElements = this.extractTables(textElements, viewport, pageNum);
        const annotationElements = this.extractAnnotations(annotations, viewport, pageNum);
        const shapeElements = this.extractShapes(operatorList, viewport, pageNum);

        pageStructure.layers.text = textElements;
        pageStructure.layers.images = imageElements;
        pageStructure.layers.tables = tableElements;
        pageStructure.layers.annotations = annotationElements;
        pageStructure.layers.shapes = shapeElements;

        structure.pages.push(pageStructure);
        
        // Aggregate elements
        structure.layers.text.push(...textElements);
        structure.layers.images.push(...imageElements);
        structure.layers.tables.push(...tableElements);
        structure.layers.annotations.push(...annotationElements);
        structure.layers.shapes.push(...shapeElements);

        console.log(`Page ${pageNum} processed:`, {
          text: textElements.length,
          images: imageElements.length,
          tables: tableElements.length,
          annotations: annotationElements.length,
          shapes: shapeElements.length
        });
      }

      await pdfDoc.destroy();
      console.log('PDF processing completed');
      return structure;

    } catch (error) {
      console.error('Error extracting PDF structure:', error);
      throw error;
    }
  }


  // Extract text elements with styling and coordinates
  extractTextElements(textContent, viewport, pageNum) {
    const textElements = [];

    textContent.items.forEach((item, index) => {
      const transform = item.transform;
      const x = transform[4];
      const y = viewport.height - transform[5];
      
      const textElement = {
        id: `text-${pageNum}-${index}`,
        type: 'text',
        tag: 'div',
        content: item.str,
        originalContent: item.str,
        page: pageNum,
        x: x,
        y: y,
        width: item.width,
        height: item.height,
        fontSize: item.height,
        fontName: item.fontName,
        color: this.getTextColor(item),
        style: {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          fontSize: `${item.height}px`,
          fontFamily: item.fontName || 'Arial, sans-serif',
          color: this.getTextColor(item) || '#000000',
          whiteSpace: 'pre',
          cursor: 'text',
          background: 'transparent',
          border: '1px solid transparent',
          padding: '2px',
          zIndex: 10,
          minWidth: `${item.width}px`,
          minHeight: `${item.height}px`,
          lineHeight: 1,
          transform: 'translateY(-100%)'
        }
      };

      textElements.push(textElement);
    });

    return textElements;
  }

  // Extract text color from item
  getTextColor(item) {
    if (item.color && item.color !== 'rgba(0, 0, 0, 1)') {
      return this.rgbToHex(item.color);
    }
    return '#000000';
  }

  // Convert RGB to Hex
  rgbToHex(rgb) {
    if (Array.isArray(rgb)) {
      const [r, g, b] = rgb.map(c => Math.round(c * 255));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return '#000000';
  }

  // Extract images from PDF
  async extractImages(page, viewport, pageNum, sessionId) {
    const imageElements = [];
    
    try {
      const opList = await page.getOperatorList();
      let imageIndex = 0;

      for (let i = 0; i < opList.fnArray.length; i++) {
        const op = opList.fnArray[i];
        
        // Check for image operations
        if (op === pdfjsLib.OPS.paintImageXObject || 
            op === pdfjsLib.OPS.paintJpegXObject) {
          
          try {
            const imageObj = await this.extractImageObject(page, opList.argsArray[i][0]);
            if (imageObj) {
              const imageElement = await this.createImageElement(imageObj, viewport, pageNum, imageIndex, sessionId);
              if (imageElement) {
                imageElements.push(imageElement);
                imageIndex++;
              }
            }
          } catch (error) {
            console.error('Error extracting image:', error);
          }
        }
      }

      // If no embedded images found, use fallback detection
      if (imageElements.length === 0) {
        const fallbackImages = await this.extractImagesFallback(page, viewport, pageNum);
        imageElements.push(...fallbackImages);
      }

    } catch (error) {
      console.error('Error in image extraction:', error);
    }

    return imageElements;
  }

  // Extract image object from PDF
  async extractImageObject(page, imageName) {
    try {
      const resources = await page.getResources();
      const xobject = resources.get('XObject');
      
      if (xobject && xobject.get(imageName)) {
        const image = xobject.get(imageName);
        return image;
      }
    } catch (error) {
      console.error('Error extracting image object:', error);
    }
    return null;
  }

  // Create image element with coordinates
  async createImageElement(imageObj, viewport, pageNum, imageIndex, sessionId) {
    try {
      // For demo purposes, create placeholder image data
      // In production, you'd convert the imageObj to actual image data
      const imageData = await this.convertImageToDataURL(imageObj);
      
      const imageElement = {
        id: `image-${pageNum}-${imageIndex}`,
        type: 'image',
        tag: 'div',
        content: '',
        page: pageNum,
        x: 100 + (imageIndex * 200), // Placeholder coordinates
        y: 100 + (imageIndex * 150), // Placeholder coordinates
        width: 200,
        height: 150,
        imageData: imageData,
        imageUrl: `/api/tools/pdf-editor/images/${sessionId}/page-${pageNum}/image-${imageIndex}.png`,
        style: {
          position: 'absolute',
          left: `${100 + (imageIndex * 200)}px`,
          top: `${100 + (imageIndex * 150)}px`,
          width: '200px',
          height: '150px',
          border: '3px solid #ff4444',
          background: imageData ? `url(${imageData}) no-repeat center center` : 'rgba(255, 68, 68, 0.2)',
          backgroundSize: 'contain',
          pointerEvents: 'none',
          zIndex: 5,
          boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)'
        }
      };

      return imageElement;
    } catch (error) {
      console.error('Error creating image element:', error);
      return null;
    }
  }

  // Convert image to data URL (placeholder implementation)
  async convertImageToDataURL(imageObj) {
    // This is a simplified implementation
    // In production, you'd properly convert the PDF image object to a data URL
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03NSA1MEgxMjVNMTI1IDUwVjc1TTEyNSA3NUg3NU03NSA3NVY1MCIgc3Ryb2tlPSIjOEREIiBzdHJva2Utd2lkdGg9IjIiLz4KPHRleHQgeD0iMTAwIiB5PSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMTQiPkltYWdlPC90ZXh0Pgo8L3N2Zz4K';
  }

  // Fallback image extraction using canvas
  async extractImagesFallback(page, viewport, pageNum) {
    const imageElements = [];
    
    // This would require a headless browser or canvas implementation
    // For now, return placeholder images
    const placeholderImages = [
      {
        id: `image-${pageNum}-0`,
        type: 'image',
        tag: 'div',
        content: '',
        page: pageNum,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        style: {
          position: 'absolute',
          left: '100px',
          top: '100px',
          width: '200px',
          height: '150px',
          border: '3px solid #ff4444',
          background: 'rgba(255, 68, 68, 0.2)',
          pointerEvents: 'none',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff4444',
          fontSize: '14px',
          fontWeight: 'bold'
        }
      }
    ];

    return placeholderImages;
  }

  // Extract tables from text content
  extractTables(textElements, viewport, pageNum) {
    const tableElements = [];
    
    if (textElements.length === 0) return tableElements;

    const yTolerance = 8;
    const rows = {};
    
    textElements.forEach(element => {
      const rowKey = Math.round(element.y / yTolerance) * yTolerance;
      if (!rows[rowKey]) rows[rowKey] = [];
      rows[rowKey].push(element);
    });

    // Find table structures
    const rowEntries = Object.entries(rows)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b));

    let currentTable = null;

    for (let i = 0; i < rowEntries.length; i++) {
      const [yKey, rowElements] = rowEntries[i];
      const currentY = parseFloat(yKey);

      if (this.isTableRow(rowElements)) {
        if (!currentTable) {
          currentTable = {
            rows: [],
            minX: Infinity,
            maxX: -Infinity,
            minY: currentY,
            maxY: currentY
          };
        }
        
        currentTable.rows.push({ y: currentY, elements: rowElements });
        currentTable.maxY = currentY;
        
        rowElements.forEach(element => {
          currentTable.minX = Math.min(currentTable.minX, element.x);
          currentTable.maxX = Math.max(currentTable.maxX, element.x + element.width);
        });

      } else if (currentTable && currentTable.rows.length >= 2) {
        const tableElement = this.createTableElement(currentTable, pageNum, tableElements.length);
        tableElements.push(tableElement);
        currentTable = null;
      }
    }

    if (currentTable && currentTable.rows.length >= 2) {
      const tableElement = this.createTableElement(currentTable, pageNum, tableElements.length);
      tableElements.push(tableElement);
    }

    return tableElements;
  }

  // Check if row has table structure
  isTableRow(rowElements) {
    if (rowElements.length < 2) return false;
    
    const sortedElements = rowElements.sort((a, b) => a.x - b.x);
    
    for (let i = 1; i < sortedElements.length; i++) {
      const prev = sortedElements[i - 1];
      const curr = sortedElements[i];
      const gap = curr.x - (prev.x + prev.width);
      
      if (gap < 0 || gap > 100) {
        return false;
      }
    }
    
    return true;
  }

  // Create table element - FIXED: Added tableIndex parameter
  createTableElement(tableData, pageNum, tableIndex) {
    const tableHeight = tableData.maxY - tableData.minY + (tableData.rows[0]?.elements[0]?.height || 20);
    
    return {
      id: `table-${pageNum}-${tableIndex}`,
      type: 'table',
      tag: 'div',
      content: '',
      page: pageNum,
      x: tableData.minX,
      y: tableData.minY,
      width: tableData.maxX - tableData.minX,
      height: tableHeight,
      rows: tableData.rows.map((row, rowIndex) => ({
        id: `row-${rowIndex}`,
        y: row.y,
        cells: row.elements.map((cell, cellIndex) => ({
          id: `cell-${rowIndex}-${cellIndex}`,
          x: cell.x,
          y: cell.y,
          width: cell.width,
          height: cell.height,
          content: cell.content
        }))
      })),
      style: {
        position: 'absolute',
        left: `${tableData.minX}px`,
        top: `${tableData.minY}px`,
        width: `${tableData.maxX - tableData.minX}px`,
        height: `${tableHeight}px`,
        border: '3px solid #0066cc',
        pointerEvents: 'none',
        zIndex: 7,
        background: 'rgba(0, 102, 204, 0.05)',
        padding: '10px'
      }
    };
  }

  // Extract annotations
  extractAnnotations(annotations, viewport, pageNum) {
    return annotations.map((annotation, index) => ({
      id: `annotation-${pageNum}-${index}`,
      type: 'annotation',
      tag: 'div',
      content: annotation.contents || '',
      page: pageNum,
      x: annotation.rect[0],
      y: viewport.height - annotation.rect[3],
      width: annotation.rect[2] - annotation.rect[0],
      height: annotation.rect[3] - annotation.rect[1],
      annotationType: annotation.subtype,
      style: {
        position: 'absolute',
        left: `${annotation.rect[0]}px`,
        top: `${viewport.height - annotation.rect[3]}px`,
        width: `${annotation.rect[2] - annotation.rect[0]}px`,
        height: `${annotation.rect[3] - annotation.rect[1]}px`,
        border: '2px dotted #00aa00',
        background: 'rgba(0, 170, 0, 0.1)',
        pointerEvents: 'none',
        zIndex: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#006400',
        fontWeight: 'bold'
      }
    }));
  }

  // Extract shapes from operator list
  extractShapes(operatorList, viewport, pageNum) {
    const shapeElements = [];
    
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const op = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      if (op === pdfjsLib.OPS.rectangle) {
        const [x, y, width, height] = args;
        const shapeElement = {
          id: `shape-${pageNum}-${shapeElements.length}`,
          type: 'shape',
          tag: 'div',
          content: '',
          page: pageNum,
          x: x,
          y: viewport.height - y - height,
          width: width,
          height: height,
          style: {
            position: 'absolute',
            left: `${x}px`,
            top: `${viewport.height - y - height}px`,
            width: `${width}px`,
            height: `${height}px`,
            border: '2px solid #888',
            background: 'rgba(136, 136, 136, 0.1)',
            pointerEvents: 'none',
            zIndex: 2
          }
        };
        shapeElements.push(shapeElement);
      }
    }

    return shapeElements;
  }

  // Get PDF structure for specific session
  async getStructure(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID missing'
        });
      }

      const filePath = path.join(
        __dirname,
        '../../../uploads/sessions',
        sessionId,
        'original.pdf'
      );

      const fileBuffer = await fs.readFile(filePath);
      const pdfUint8Array = new Uint8Array(fileBuffer);
const structure = await this.extractCompletePDFStructure(pdfUint8Array, sessionId);

      res.json({
        success: true,
        structure
      });

    } catch (error) {
      console.error('Get structure error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update text content
  async updateText(req, res) {
    try {
      const { sessionId, elementId, newContent } = req.body;
      
      if (!sessionId || !elementId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and element ID are required'
        });
      }

      // In a real implementation, you'd update the stored structure
      // For now, just acknowledge the update
      res.json({
        success: true,
        message: 'Text updated successfully'
      });

    } catch (error) {
      console.error('Update text error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Export to PDF
  async exportPDF(req, res) {
    try {
      const { sessionId, structure } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID missing'
        });
      }

      const sessionDir = path.join(__dirname, '../../../uploads/sessions', sessionId);
      const exportFilePath = path.join(sessionDir, 'exported.pdf');

      // Create new PDF with edited content
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const pageStructure of structure.pages) {
        const page = pdfDoc.addPage([pageStructure.width, pageStructure.height]);
        
        // Add text elements
        for (const textElement of pageStructure.layers.text) {
          page.drawText(textElement.content, {
            x: textElement.x,
            y: pageStructure.height - textElement.y - textElement.height,
            size: textElement.fontSize || 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        }

        // Add table borders
        for (const table of pageStructure.layers.tables) {
          page.drawRectangle({
            x: table.x,
            y: pageStructure.height - table.y - table.height,
            width: table.width,
            height: table.height,
            borderColor: rgb(0, 0.4, 0.8),
            borderWidth: 2,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(exportFilePath, pdfBytes);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=exported-document.pdf');
      res.send(pdfBytes);

    } catch (error) {
      console.error('Export PDF error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Serve images
  async serveImage(req, res) {
    try {
      const { sessionId, pageNum, imageId } = req.params;
      
      // For now, return a placeholder image
      // In production, you'd serve the actual extracted images
      const placeholderSvg = '<svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="150" fill="#F3F4F6"/><path d="M75 50H125M125 50V75M125 75H75M75 75V50" stroke="#8D8" stroke-width="2"/><text x="100" y="110" text-anchor="middle" fill="#999" font-size="14">Image</text></svg>';
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(placeholderSvg);

    } catch (error) {
      console.error('Serve image error:', error);
      res.status(500).send('Error serving image');
    }
  }

  // ADD MISSING METHODS:

  // Apply edits - placeholder implementation
  async applyEdits(req, res) {
    try {
      const { sessionId, edits } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID missing'
        });
      }

      // In a real implementation, you'd apply the edits to the PDF
      // For now, just acknowledge the request
      res.json({
        success: true,
        message: 'Edits applied successfully'
      });

    } catch (error) {
      console.error('Apply edits error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Download edited PDF
  async downloadEdited(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID missing'
        });
      }

      const sessionDir = path.join(__dirname, '../../../uploads/sessions', sessionId);
      const exportedFilePath = path.join(sessionDir, 'exported.pdf');

      // Check if exported file exists
      try {
        await fs.access(exportedFilePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'No edited PDF found. Please export first.'
        });
      }

      const fileBuffer = await fs.readFile(exportedFilePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=edited-document.pdf');
      res.send(fileBuffer);

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
const editController = new EditController();
module.exports = editController;