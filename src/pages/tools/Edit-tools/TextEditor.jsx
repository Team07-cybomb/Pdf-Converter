// PDFEditor.jsx (replace your existing React file content with this)
// This is your existing component with modified handleProcessPDF to send data to backend.
// Note: keep other imports (lucide icons etc.) if needed — I kept them consistent with your original.

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Download, 
  RotateCcw, 
  FileText, 
  Upload, 
  MousePointer,
  Type,
  Pen,
  Eraser,
  Square,
  Circle,
  Minus,
  Highlighter,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const PDFEditor = () => {
  const [activeTool, setActiveTool] = useState('pen');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState([]);
  const [textAnnotations, setTextAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [fillColor, setFillColor] = useState('#ffffff');
  const [filename, setFilename] = useState('edited-document');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [editingText, setEditingText] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);

  const tools = [
    { id: 'pen', name: 'Pen', icon: Pen },
    { id: 'highlighter', name: 'Highlighter', icon: Highlighter },
    { id: 'text', name: 'Text', icon: Type },
    { id: 'rectangle', name: 'Rectangle', icon: Square },
    { id: 'circle', name: 'Circle', icon: Circle },
    { id: 'line', name: 'Line', icon: Minus },
    { id: 'eraser', name: 'Eraser', icon: Eraser },
    { id: 'select', name: 'Select', icon: MousePointer },
  ];

  // Initialize canvas when page dimensions change
  useEffect(() => {
    if (pageDimensions.width > 0 && pageDimensions.height > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        // Set canvas actual pixel size to match PDF rendered dimensions for crisp overlay
        canvas.width = pageDimensions.width;
        canvas.height = pageDimensions.height;
        // set style to fill container (CSS)
        canvas.style.width = `${pageDimensions.width}px`;
        canvas.style.height = `${pageDimensions.height}px`;
        redrawCanvas();
      }
    }
  }, [pageDimensions, currentPage, annotations, textAnnotations]);

  // Focus text input when editing
  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingText]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully! Pages:', numPages);
    setNumPages(numPages);
    setCurrentPage(1);
    setIsLoading(false);
    setError('');
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setIsLoading(false);
    setError('Failed to load PDF file. Please try a different file.');
  };

  const onPageLoadSuccess = (page) => {
    const { width, height } = page.getViewport({ scale });
    // Use integer pixel sizes
    setPageDimensions({ width: Math.round(width), height: Math.round(height) });
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw all annotations for current page
    annotations
      .filter(ann => ann.page === currentPage)
      .forEach(annotation => {
        drawAnnotation(annotation);
      });
    
    // Draw text annotations for current page
    textAnnotations
      .filter(text => text.page === currentPage)
      .forEach(textAnn => {
        drawTextAnnotation(textAnn);
      });
    
    // Draw current annotation
    if (currentAnnotation && currentAnnotation.page === currentPage) {
      drawAnnotation(currentAnnotation);
    }
  };

  const drawAnnotation = (annotation) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = annotation.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = annotation.fillColor || 'transparent';
    
    switch (annotation.type) {
      case 'pen':
        ctx.globalAlpha = 1;
        ctx.beginPath();
        annotation.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        break;
        
      case 'highlighter':
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.lineWidth || 20;
        ctx.beginPath();
        annotation.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
        
      case 'rectangle':
        if (annotation.points.length >= 2) {
          const start = annotation.points[0];
          const end = annotation.points[annotation.points.length - 1];
          const width = end.x - start.x;
          const height = end.y - start.y;
          if (annotation.fillColor && annotation.fillColor !== 'transparent') {
            ctx.fillStyle = annotation.fillColor;
            ctx.fillRect(start.x, start.y, width, height);
          }
          ctx.strokeRect(start.x, start.y, width, height);
        }
        break;
        
      case 'circle':
        if (annotation.points.length >= 2) {
          const start = annotation.points[0];
          const end = annotation.points[annotation.points.length - 1];
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          if (annotation.fillColor && annotation.fillColor !== 'transparent') {
            ctx.fill();
          }
          ctx.stroke();
        }
        break;
        
      case 'line':
        if (annotation.points.length >= 2) {
          const start = annotation.points[0];
          const end = annotation.points[annotation.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
        break;
        
      case 'eraser':
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = annotation.lineWidth;
        ctx.beginPath();
        annotation.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        break;
    }
  };

  const drawTextAnnotation = (textAnn) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = textAnn.color;
    ctx.font = `bold ${textAnn.fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(textAnn.text, textAnn.x, textAnn.y);
  };

  // Canvas event handlers
  const handleMouseDown = (e) => {
    if (!pdfUrl) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    setIsDrawing(true);
    
    if (activeTool === 'text') {
      setTextPosition({ x, y });
      setTextInput('');
      setEditingText(true);
      setIsDrawing(false);
      return;
    }
    
    if (activeTool === 'select') {
      setIsDrawing(false);
      return;
    }
    
    const newAnnotation = {
      id: Date.now(),
      type: activeTool,
      points: [{ x, y }],
      color: activeTool === 'eraser' ? '#000000' : 
             activeTool === 'highlighter' ? '#ffff00' : brushColor,
      lineWidth: activeTool === 'eraser' ? brushSize * 3 : 
                activeTool === 'highlighter' ? 20 : brushSize,
      fillColor: fillColor,
      page: currentPage
    };
    
    setCurrentAnnotation(newAnnotation);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentAnnotation || activeTool === 'select' || activeTool === 'text') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const updatedAnnotation = {
      ...currentAnnotation,
      points: [...currentAnnotation.points, { x, y }]
    };
    
    setCurrentAnnotation(updatedAnnotation);
    // draw current annotation onto canvas immediately for feedback
    redrawCanvas();
    // Also draw the currentAnnotation visually by temporarily drawing it
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawAnnotation(updatedAnnotation);
    }
  };

  const handleMouseUp = () => {
    if (currentAnnotation && currentAnnotation.points.length > 0) {
      setAnnotations(prev => [...prev, currentAnnotation]);
    }
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && editingText) {
      const newTextAnnotation = {
        id: Date.now(),
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        color: brushColor,
        fontSize: 16,
        page: currentPage
      };
      
      setTextAnnotations(prev => [...prev, newTextAnnotation]);
      setEditingText(false);
      setTextInput('');
      redrawCanvas();
    } else {
      setEditingText(false);
    }
  };

  // Simple file upload from local computer
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      setError('No file selected');
      return;
    }

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file (.pdf)');
      return;
    }

    console.log('Selected file:', file.name, 'Size:', (file.size / 1024).toFixed(2) + 'KB');

    // Reset previous state
    setError('');
    setIsLoading(true);
    
    // Clean up previous file URL if exists
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    try {
      const fileUrl = URL.createObjectURL(file);
      console.log('Created object URL for local file');
      
      setPdfUrl(fileUrl);
      setPdfFile(file);
      
      // Reset annotations and state
      setAnnotations([]);
      setTextAnnotations([]);
      setCurrentPage(1);
      setNumPages(null);
      setCurrentAnnotation(null);
      setEditingText(false);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process the file. Please try another PDF.');
      setIsLoading(false);
    }
  };

  // helper: convert file (PDF) to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is an ArrayBuffer or data URL depending on read method
        // use readAsDataURL to get data URL
        resolve(reader.result.split(',')[1]); // return base64 only
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // helper: capture canvas as dataURL (PNG)
  const captureCanvasDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not available');
    // return data URL (string like data:image/png;base64,...)
    return canvas.toDataURL('image/png');
  };

  // New: POST base64 PDF + annotation image to server for merging and download
  const handleProcessPDF = async () => {
    if (!pdfFile && (!annotations.length && !textAnnotations.length)) {
      setError('No PDF or annotations to process');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Convert original pdf to base64 (if exists)
      let pdfBase64 = null;
      if (pdfFile) {
        pdfBase64 = await fileToBase64(pdfFile); // base64 string (no prefix)
      }

      // Capture canvas overlay as PNG dataURL (includes prefix)
      const annotationDataUrl = captureCanvasDataUrl();

      // If there are no visible annotations on canvas (blank), still send (backend can handle)
      // Build payload
      const payload = {
        pdfBase64, // may be null
        annotationData: annotationDataUrl, // data:image/png;base64,...
        filename: filename || 'edited-document',
        page: currentPage // page index 1-based
      };

      // Send to backend - adjust URL according to your routing; here assumed /api/edit/process-pdf
      const res = await fetch('/api/edit/process-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Server error while processing PDF');
      }

      // Server returns application/pdf content
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename || 'edited-document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      console.log('Downloaded response from backend');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to process/download PDF: ' + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    
    setPdfFile(null);
    setPdfUrl(null);
    setAnnotations([]);
    setTextAnnotations([]);
    setCurrentAnnotation(null);
    setFilename('edited-document');
    setError('');
    setNumPages(null);
    setCurrentPage(1);
    setEditingText(false);
    setIsLoading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAnnotations = () => {
    setAnnotations(prev => prev.filter(ann => ann.page !== currentPage));
    setTextAnnotations(prev => prev.filter(text => text.page !== currentPage));
    redrawCanvas();
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
      setEditingText(false);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setEditingText(false);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl p-6 max-w-7xl mx-auto"
    >
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-4">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">PDF Editor</h2>
          <p className="text-sm text-muted-foreground">Upload and edit PDF files from your computer</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* File Upload Section */}
        {!pdfFile && (
          <div className="text-center">
            <label
              htmlFor="pdf-file-upload"
              className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white"
            >
              <Upload className="w-20 h-20 text-gray-400 mb-6" />
              <p className="font-semibold text-2xl text-center mb-4">
                Upload PDF File
              </p>
              <p className="text-gray-600 text-center text-lg mb-6">
                Click here to select a PDF file from your computer
              </p>
              <div className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold text-lg">
                Browse Files
              </div>
              <input
                id="pdf-file-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf"
              />
            </label>
            
            <div className="mt-6 text-gray-600">
              <p className="font-semibold">How to upload:</p>
              <p>1. Click the "Browse Files" button above</p>
              <p>2. Select a PDF file from your computer</p>
              <p>3. The PDF will load automatically</p>
              <p>4. Start editing with the tools on the left</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center p-12 bg-white rounded-lg border">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-700">Loading PDF File...</p>
            <p className="text-gray-600 mt-2">Processing your PDF document</p>
          </div>
        )}

        {/* PDF Editor Interface */}
        {pdfFile && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tools Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* File Info */}
              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <h3 className="font-semibold mb-2">File Info</h3>
                <p className="text-sm text-gray-600 truncate" title={pdfFile.name}>
                  <strong>File:</strong> {pdfFile.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Size:</strong> {(pdfFile.size / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Pages:</strong> {numPages || 'Loading...'}
                </p>
              </div>

              {/* Tools */}
              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <h3 className="font-semibold mb-3">Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        activeTool === tool.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-600' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={tool.name}
                    >
                      <tool.icon className="h-5 w-5 mx-auto" />
                      <span className="text-xs mt-1 block">{tool.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors & Sizes */}
              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <h3 className="font-semibold mb-3">Colors & Sizes</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm block mb-2">Stroke Color</label>
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-full h-10 cursor-pointer rounded border"
                    />
                  </div>
                  <div>
                    <label className="text-sm block mb-2">Fill Color</label>
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="w-full h-10 cursor-pointer rounded border"
                    />
                  </div>
                  <div>
                    <label className="text-sm block mb-2">Brush Size: {brushSize}px</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Page Controls */}
              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <h3 className="font-semibold mb-3">Page Controls</h3>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {numPages || '?'}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === numPages}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={zoomOut}
                    className="flex-1 p-2 rounded border hover:bg-gray-50"
                  >
                    <ZoomOut className="h-4 w-4 mx-auto" />
                  </button>
                  <span className="flex items-center px-2 text-sm">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    className="flex-1 p-2 rounded border hover:bg-gray-50"
                  >
                    <ZoomIn className="h-4 w-4 mx-auto" />
                  </button>
                </div>
                
                <button
                  onClick={clearAnnotations}
                  className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                >
                  Clear Annotations
                </button>
              </div>
            </div>

            {/* PDF Canvas Area */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">
                    Editing: {pdfFile.name} - Page {currentPage} of {numPages || '?'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Active: {tools.find(t => t.id === activeTool)?.name}
                    </span>
                  </div>
                </div>
                
                {/* PDF Display with Annotation Canvas */}
                <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center min-h-[600px]">
                  
                  {/* PDF Document */}
                  {pdfUrl && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white">
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                          <div className="text-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                            <p className="text-gray-600">Loading PDF document...</p>
                          </div>
                        }
                        error={
                          <div className="text-center p-8 text-red-500">
                            <FileText className="h-12 w-12 mx-auto mb-2" />
                            <p className="font-semibold">Failed to load PDF</p>
                          </div>
                        }
                      >
                        <Page 
                          pageNumber={currentPage} 
                          scale={scale}
                          onLoadSuccess={onPageLoadSuccess}
                          loading={
                            <div className="text-center p-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                              <p className="text-gray-600">Loading page {currentPage}...</p>
                            </div>
                          }
                        />
                      </Document>
                    </div>
                  )}
                  
                  {/* Annotation Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />

                  {/* Text Input Overlay */}
                  {editingText && (
                    <div 
                      className="absolute border-2 border-blue-500 bg-white p-2 rounded shadow-lg z-10"
                      style={{
                        left: textPosition.x,
                        top: textPosition.y,
                        minWidth: '200px'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          ref={textInputRef}
                          type="text"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="Enter your text here..."
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextSubmit();
                            if (e.key === 'Escape') setEditingText(false);
                          }}
                        />
                        <button
                          onClick={() => setEditingText(false)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleTextSubmit}
                          className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Add Text
                        </button>
                        <button
                          onClick={() => setEditingText(false)}
                          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t border-gray-200 mt-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Output Filename</label>
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter filename"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleProcessPDF}
                      disabled={isProcessing || !pdfUrl}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white transition-all ${
                        isProcessing || !pdfUrl
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      }`}
                    >
                      <Download className="h-5 w-5" />
                      {isProcessing ? "Processing..." : "Download Page"}
                    </button>

                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-all"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Upload New PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PDFEditor;
