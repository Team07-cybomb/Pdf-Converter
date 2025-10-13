import React, { useState, useRef, useEffect } from "react";
import {
  File,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  Image,
  Edit,
  MousePointer,
  Save,
  Download,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = `${API_URL}/api`;

const PDFEditor = () => {
  const [status, setStatus] = useState("upload");
  const [fileData, setFileData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState("select");
  const [edits, setEdits] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfjsLib, setPdfjsLib] = useState(null);
  const [pdfStructure, setPdfStructure] = useState({
    pages: [],
    metadata: {},
    fonts: [],
    images: []
  });
  const [selectedElement, setSelectedElement] = useState(null);

  const fileInputRef = useRef();
  const fileInputImageRef = useRef();
  const containerRef = useRef();
  const canvasRef = useRef();

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        if (window.pdfjsLib) {
          setPdfjsLib(window.pdfjsLib);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          console.log('PDF.js loaded successfully');
          setPdfjsLib(window.pdfjsLib);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load PDF.js:', error);
      }
    };

    loadPdfJs();
  }, []);

  // Parse PDF structure and extract content
  const parsePDFStructure = async (pdfDoc) => {
    const structure = {
      pages: [],
      metadata: {},
      fonts: new Set(),
      images: []
    };

    try {
      // Extract metadata
      const metadata = await pdfDoc.getMetadata();
      structure.metadata = {
        title: metadata.info?.Title || 'Untitled',
        author: metadata.info?.Author || 'Unknown',
        subject: metadata.info?.Subject || '',
        creator: metadata.info?.Creator || '',
        producer: metadata.info?.Producer || '',
        creationDate: metadata.info?.CreationDate || '',
        modificationDate: metadata.info?.ModDate || ''
      };

      // Parse each page
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        
        const pageStructure = {
          pageNumber: pageNum,
          width: viewport.width,
          height: viewport.height,
          viewport: viewport,
          textElements: [],
          images: [],
          blocks: []
        };

        // Process text content into structured elements
        let currentBlock = null;
        
        textContent.items.forEach((item, index) => {
          // Extract font information
          if (item.fontName) {
            structure.fonts.add(item.fontName);
          }

          const textElement = {
            id: `text-${pageNum}-${index}`,
            type: 'text',
            content: item.str,
            originalContent: item.str,
            x: item.transform[4],
            y: viewport.height - item.transform[5],
            width: item.width,
            height: item.height,
            fontSize: item.height,
            fontName: item.fontName,
            transform: item.transform,
            boundingBox: {
              left: item.transform[4] - 2,
              top: (viewport.height - item.transform[5]) - item.height - 2,
              right: item.transform[4] + item.width + 2,
              bottom: (viewport.height - item.transform[5]) + 2
            }
          };

          pageStructure.textElements.push(textElement);

          // Group text into logical blocks (lines/paragraphs)
          if (!currentBlock || shouldStartNewBlock(currentBlock, textElement)) {
            if (currentBlock) {
              pageStructure.blocks.push(currentBlock);
            }
            currentBlock = {
              id: `block-${pageNum}-${pageStructure.blocks.length}`,
              type: 'text-block',
              elements: [textElement],
              boundingBox: { ...textElement.boundingBox },
              content: textElement.content
            };
          } else {
            currentBlock.elements.push(textElement);
            currentBlock.content += textElement.content;
            // Expand bounding box
            currentBlock.boundingBox.left = Math.min(currentBlock.boundingBox.left, textElement.boundingBox.left);
            currentBlock.boundingBox.top = Math.min(currentBlock.boundingBox.top, textElement.boundingBox.top);
            currentBlock.boundingBox.right = Math.max(currentBlock.boundingBox.right, textElement.boundingBox.right);
            currentBlock.boundingBox.bottom = Math.max(currentBlock.boundingBox.bottom, textElement.boundingBox.bottom);
          }
        });

        // Add the last block
        if (currentBlock) {
          pageStructure.blocks.push(currentBlock);
        }

        structure.pages.push(pageStructure);
      }

      structure.fonts = Array.from(structure.fonts);
      return structure;
    } catch (error) {
      console.error('Error parsing PDF structure:', error);
      return structure;
    }
  };

  // Helper function to determine text grouping
  const shouldStartNewBlock = (currentBlock, newElement) => {
    const lastElement = currentBlock.elements[currentBlock.elements.length - 1];
    
    // Start new block if vertical gap is large (likely new line)
    const verticalGap = Math.abs(newElement.y - lastElement.y);
    if (verticalGap > lastElement.height * 1.5) {
      return true;
    }
    
    // Start new block if horizontal position suggests new line
    if (newElement.x < lastElement.x - lastElement.width) {
      return true;
    }
    
    return false;
  };

  // Enhanced rendering with structured content overlay
  const renderPageWithStructure = async (pageNum, scaleValue = scale) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scaleValue });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear canvas with white background
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Render the PDF page
      await page.render(renderContext).promise;
      
      // Apply user edits
      applyEditsToCanvas(context, pageNum);

    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  // Apply visual edits to canvas
  const applyEditsToCanvas = (context, pageNum) => {
    const pageEdits = edits.filter(edit => edit.page === pageNum);
    
    pageEdits.forEach(edit => {
      context.save();
      
      switch (edit.type) {
        case "add-text":
          context.font = `${edit.fontSize || 16}px Arial`;
          context.fillStyle = edit.color || "#000000";
          context.fillText(edit.content, edit.x, edit.y);
          break;
          
        case "modify-text":
          // Modified text is handled in the structure, but we can highlight it
          if (edit.isCurrentEdit) {
            context.fillStyle = 'rgba(255, 255, 0, 0.3)';
            context.fillRect(edit.x - 2, edit.y - edit.fontSize - 2, 
                           edit.width + 4, edit.fontSize + 4);
          }
          break;
          
        case "image":
          if (edit.imageData) {
            const img = new Image();
            img.onload = () => {
              context.drawImage(img, edit.x, edit.y, edit.width || 200, edit.height || 150);
            };
            img.src = edit.imageData;
          }
          break;
          
        default:
          break;
      }
      
      context.restore();
    });
  };

  // Load PDF and parse structure
  const loadPdfForEditing = async (file) => {
    if (!pdfjsLib) {
      console.warn('PDF.js not loaded yet');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Parse PDF structure
      const structure = await parsePDFStructure(pdf);
      setPdfStructure(structure);
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
      // Render first page
      await renderPageWithStructure(1, scale);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF: ' + error.message);
    }
  };

  // Handle page change
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPageWithStructure(currentPage, scale);
    }
  }, [currentPage, pdfDoc]);

  // Handle scale change
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPageWithStructure(currentPage, scale);
    }
  }, [scale]);

  // Enhanced click handler for element selection
  const handleCanvasClick = (event) => {
    if (activeTool !== "select") return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find clicked element in current page structure
    const currentPageStructure = pdfStructure.pages.find(p => p.pageNumber === currentPage);
    if (!currentPageStructure) return;

    // Check text elements first
    const clickedElement = currentPageStructure.textElements.find(element => {
      const bbox = element.boundingBox;
      return x >= bbox.left && x <= bbox.right &&
             y >= bbox.top && y <= bbox.bottom;
    });

    if (clickedElement) {
      setSelectedElement(clickedElement);
      console.log('Selected text element:', clickedElement);
    } else {
      setSelectedElement(null);
    }
  };

  // Inline text editing
  const handleInlineEdit = () => {
    if (!selectedElement) {
      alert("Please select text from the PDF first by clicking on it");
      return;
    }

    const newText = prompt("Edit text:", selectedElement.content);
    if (newText !== null && newText !== selectedElement.content) {
      // Update the PDF structure
      const updatedPages = pdfStructure.pages.map(page => {
        if (page.pageNumber === currentPage) {
          const updatedTextElements = page.textElements.map(element =>
            element.id === selectedElement.id 
              ? { ...element, content: newText }
              : element
          );
          
          // Update blocks that contain this element
          const updatedBlocks = page.blocks.map(block => ({
            ...block,
            elements: block.elements.map(el =>
              el.id === selectedElement.id ? { ...el, content: newText } : el
            ),
            content: block.elements.map(el => 
              el.id === selectedElement.id ? newText : el.content
            ).join('')
          }));

          return { ...page, textElements: updatedTextElements, blocks: updatedBlocks };
        }
        return page;
      });

      setPdfStructure({ ...pdfStructure, pages: updatedPages });

      // Add to edits for backend processing
      addEdit("modify-text", {
        originalText: selectedElement.originalContent,
        newText: newText,
        x: selectedElement.x,
        y: selectedElement.y,
        page: currentPage,
        objectId: selectedElement.id,
        fontSize: selectedElement.fontSize,
        width: selectedElement.width
      });

      // Re-render to show changes
      renderPageWithStructure(currentPage, scale);
    }
  };

  // Add new text
  const handleAddText = () => {
    const text = prompt("Enter new text:");
    if (text && text.trim()) {
      addEdit("add-text", {
        content: text,
        x: 50,
        y: 100,
        fontSize: 16,
        color: "#000000",
        page: currentPage,
      });
      renderPageWithStructure(currentPage, scale);
    }
  };

  // Insert image
  const handleInsertImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      addEdit("image", {
        imageData: e.target.result,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        page: currentPage,
      });
      renderPageWithStructure(currentPage, scale);
    };
    reader.readAsDataURL(file);
    
    event.target.value = "";
  };

  // Add edit
  const addEdit = (type, data) => {
    const newEdit = { 
      id: Date.now() + Math.random(), 
      type, 
      ...data
    };
    setEdits((prev) => [...prev, newEdit]);
  };

  // Upload PDF
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    setIsProcessing(true);
    setStatus("processing");

    try {
      const formData = new FormData();
      formData.append("pdfFile", file);

      // Upload to backend
      const uploadResponse = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/upload`,
        { 
          method: "POST", 
          body: formData 
        }
      );

      let uploadResult;
      if (uploadResponse.ok) {
        uploadResult = await uploadResponse.json();
        setFileData(uploadResult);
      } else {
        console.warn('Backend upload failed, loading PDF locally');
        uploadResult = { success: true, totalPages: 0 };
      }

      // Load PDF for editing with structure parsing
      await loadPdfForEditing(file);

      setStatus("editor");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error processing PDF: " + err.message);
      setStatus("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply edits to backend
  const applyEdits = async () => {
    if (!fileData) return;
    setIsProcessing(true);

    try {
      // Collect all text modifications from structure
      const textModifications = pdfStructure.pages.flatMap(page =>
        page.textElements
          .filter(element => element.content !== element.originalContent)
          .map(element => ({
            type: "modify-text",
            originalText: element.originalContent,
            newText: element.content,
            x: element.x,
            y: element.y,
            page: page.pageNumber,
            objectId: element.id,
            fontSize: element.fontSize,
            width: element.width
          }))
      );

      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/apply-edits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: fileData.sessionId,
            edits: [...edits, ...textModifications]
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert("PDF edited successfully! You can now download the edited version.");
        } else {
          throw new Error(result.error || "Apply edits failed");
        }
      } else {
        throw new Error("Failed to apply edits");
      }
    } catch (err) {
      console.error("Apply edits error:", err);
      alert("Failed to apply edits: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download PDF
  const downloadEditedPDF = async () => {
    if (!fileData) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/download/${fileData.sessionId}`
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "edited-document.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Download failed");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed: " + err.message);
    }
  };

  // Toolbar buttons
  const toolsList = [
    { name: "select", icon: MousePointer, hint: "Select Text" },
    { name: "modify-text", icon: Edit, hint: "Edit Selected Text" },
    { name: "add-text", icon: Type, hint: "Add New Text" },
    { name: "image", icon: Image, hint: "Insert Image" },
  ];

  // Render upload screen
  const renderUploadScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-8 max-w-md w-full text-center">
        <File className="w-16 h-16 mx-auto text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">PDF Editor</h2>
        <p className="text-gray-600 mb-6">
          Edit PDF text content directly with structured parsing
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center mx-auto"
          disabled={isProcessing}
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          {isProcessing ? "Processing..." : "Choose PDF File"}
        </button>
      </div>
    </div>
  );

  // Render processing screen
  const renderProcessingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Parsing PDF Structure...
        </h3>
        <p className="text-gray-600">Extracting text, layout, and metadata</p>
      </div>
    </div>
  );

  // Render editor
  const renderEditor = () => (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex space-x-1">
            {toolsList.map((tool) => (
              <button
                key={tool.name}
                className={`p-2 rounded-lg transition-colors ${
                  activeTool === tool.name ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
                title={tool.hint}
                onClick={() => setActiveTool(tool.name)}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            ))}

            <input
              ref={fileInputImageRef}
              type="file"
              accept="image/*"
              onChange={handleInsertImage}
              className="hidden"
            />
            <button
              onClick={() => fileInputImageRef.current?.click()}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="Insert Image"
            >
              <Image className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Page Navigation */}
            <div className="flex items-center space-x-2">
              <button
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm font-medium">{currentPage} / {totalPages}</span>

              <button
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center space-x-2">
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            {/* Apply & Download */}
            <div className="flex space-x-2">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex items-center disabled:opacity-50"
                onClick={applyEdits}
                disabled={isProcessing}
              >
                <Save className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Apply Edits"}
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center"
                onClick={downloadEditedPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-200 p-4 overflow-auto flex justify-center items-start">
          <div
            ref={containerRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden relative"
            style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: "center center",
              maxWidth: '100%'
            }}
          >
            <canvas
              ref={canvasRef}
              className="block border border-gray-300 cursor-crosshair"
              onClick={handleCanvasClick}
              style={{ 
                display: 'block',
                maxWidth: '100%',
                height: 'auto'
              }}
            />
            
            {/* Interactive overlay for text selection */}
            {pdfStructure.pages.find(p => p.pageNumber === currentPage)?.textElements.map(element => (
              <div
                key={element.id}
                className={`absolute border border-transparent hover:border-blue-400 hover:bg-blue-50 hover:bg-opacity-30 transition-all ${
                  selectedElement?.id === element.id ? 'border-blue-500 bg-blue-100 bg-opacity-50' : ''
                }`}
                style={{
                  left: `${element.boundingBox.left}px`,
                  top: `${element.boundingBox.top}px`,
                  width: `${element.boundingBox.right - element.boundingBox.left}px`,
                  height: `${element.boundingBox.bottom - element.boundingBox.top}px`,
                  pointerEvents: 'none' // Let clicks pass through to canvas
                }}
              />
            ))}
          </div>
        </div>

        {/* Editing Panel - UPDATED */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">PDF Structure & Editing</h3>

            {/* PDF Metadata */}
            {pdfStructure.metadata && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Document Info</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Title:</strong> {pdfStructure.metadata.title}</div>
                  <div><strong>Author:</strong> {pdfStructure.metadata.author}</div>
                  {pdfStructure.metadata.creator && (
                    <div><strong>Creator:</strong> {pdfStructure.metadata.creator}</div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Text Info */}
            {selectedElement && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Selected Text</h4>
                <p className="text-sm text-blue-700 mb-2">"{selectedElement.content}"</p>
                <div className="text-xs text-blue-600 mb-2">
                  <div>Font: {selectedElement.fontName || 'Unknown'}</div>
                  <div>Size: {selectedElement.fontSize?.toFixed(1)}px</div>
                  <div>Position: ({selectedElement.x.toFixed(1)}, {selectedElement.y.toFixed(1)})</div>
                </div>
                <button
                  onClick={handleInlineEdit}
                  className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                >
                  Edit This Text
                </button>
              </div>
            )}

            {/* Page Structure Overview */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">
                Page {currentPage} Structure
              </h4>
              <div className="text-xs text-gray-600 space-y-2">
                <div><strong>Text Elements:</strong> {pdfStructure.pages.find(p => p.pageNumber === currentPage)?.textElements.length || 0}</div>
                <div><strong>Text Blocks:</strong> {pdfStructure.pages.find(p => p.pageNumber === currentPage)?.blocks.length || 0}</div>
                <div><strong>Fonts Used:</strong> {pdfStructure.fonts.length}</div>
              </div>
            </div>

            {/* Current Edits */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">
                Current Edits: {edits.filter((e) => e.page === currentPage).length}
              </h4>
              {edits.filter((e) => e.page === currentPage).length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {edits.filter((e) => e.page === currentPage).map((edit) => (
                    <div key={edit.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="flex items-center truncate">
                        <span
                          className={`w-2 h-2 rounded mr-2 ${
                            edit.type === "modify-text" ? "bg-purple-500" :
                            edit.type === "add-text" ? "bg-blue-500" :
                            edit.type === "image" ? "bg-green-500" : "bg-gray-500"
                          }`}
                        ></span>
                        {edit.type === "modify-text" && `Edit: "${edit.originalText?.substring(0, 20)}..."`}
                        {edit.type === "add-text" && `Add: "${edit.content?.substring(0, 30)}..."`}
                        {edit.type === "image" && `Insert Image`}
                      </span>
                      <button
                        onClick={() => {
                          setEdits((prev) => prev.filter((e) => e.id !== edit.id));
                          renderPageWithStructure(currentPage, scale);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No edits on this page</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <button
                onClick={handleAddText}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center justify-center"
              >
                <Type className="w-4 h-4 mr-2" />
                Add New Text
              </button>
              <button
                onClick={() => fileInputImageRef.current?.click()}
                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex items-center justify-center"
              >
                <Image className="w-4 h-4 mr-2" />
                Insert Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Advanced PDF Editor</h1>
          <p className="text-gray-600 mt-2">Edit PDF content with structured parsing and inline editing</p>
        </div>
      </header>

      <main>
        {status === "upload" && renderUploadScreen()}
        {status === "processing" && renderProcessingScreen()}
        {status === "editor" && renderEditor()}
      </main>
    </div>
  );
};

export default PDFEditor;