// server/controllers/tool-controller/organize/Organize-controller.js

const { PDFDocument, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const organizePDF = async (req, res) => {
    const { tool } = req.params;
    const files = req.files;
    const { pages, side } = req.query; // Now includes 'side' for rotation

    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    try {
        let outputPdfBytes;
        let filename = 'processed-pdf.pdf';

        switch (tool) {
            case 'merge':
                if (files.length < 2) {
                    return res.status(400).send('Merging requires at least two PDF files.');
                }
                const mergedPdf = await PDFDocument.create();
                for (const file of files) {
                    const pdfDoc = await PDFDocument.load(file.buffer);
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                }
                outputPdfBytes = await mergedPdf.save();
                filename = 'merged-pdf.pdf';
                break;

            case 'split':
                if (files.length !== 1) {
                    return res.status(400).send('Splitting requires a single PDF file.');
                }
                if (!pages) {
                    return res.status(400).send('Splitting requires a page range (e.g., ?pages=1,3-5).');
                }

                const originalPdf = await PDFDocument.load(files[0].buffer);
                const splitPdf = await PDFDocument.create();
                
                const pageIndices = pages.split(',').flatMap(range => {
                    const [start, end] = range.split('-').map(Number);
                    if (isNaN(start)) return [];
                    if (isNaN(end)) return [start - 1];
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i - 1);
                }).filter(index => index >= 0 && index < originalPdf.getPageCount());

                if (pageIndices.length === 0) {
                    return res.status(400).send('Invalid or empty page range specified.');
                }
                
                const extractedPages = await splitPdf.copyPages(originalPdf, pageIndices);
                extractedPages.forEach(page => splitPdf.addPage(page));
                outputPdfBytes = await splitPdf.save();
                filename = 'split-pdf.pdf';
                break;

            case 'rotate':
                if (files.length !== 1) {
                    return res.status(400).send('Rotating requires a single PDF file.');
                }
                if (!['90', '-90', '180'].includes(side)) {
                    return res.status(400).send('Invalid rotation side specified. Use 90, -90, or 180.');
                }
                
                const rotatePdf = await PDFDocument.load(files[0].buffer);
                const rotationAngle = parseInt(side);
                
                const pagesToRotate = rotatePdf.getPages();
                pagesToRotate.forEach(page => page.setRotation(degrees(rotationAngle)));
                
                outputPdfBytes = await rotatePdf.save();
                filename = `rotated-${rotationAngle}-pdf.pdf`;
                break;

            default:
                return res.status(400).send('Invalid tool specified.');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(outputPdfBytes));

    } catch (error) {
        console.error("PDF processing failed:", error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    organizePDF
};