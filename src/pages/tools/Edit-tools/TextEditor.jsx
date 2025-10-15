// src/pages/tools/Edit-tools/TextEditor.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  File,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  Image as ImageIcon,
  Edit,
  MousePointer,
  Table,
  Square,
  Layers,
  Download,
  RefreshCw,
} from "lucide-react";

// API configuration
const API_BASE_URL = 'http://localhost:5000';

const PDFEditor = () => {
  const [status, setStatus] = useState("upload");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState("select");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfStructure, setPdfStructure] = useState({
    pages: [],
    metadata: {},
    layers: {
      background: [],
      images: [],
      text: [],
      tables: [],
      annotations: []
    }
  });
  const [selectedElement, setSelectedElement] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const fileInputRef = useRef();
  const domCanvasRef = useRef();
  const containerRef = useRef();

  // File upload handler - sends to backend for processing
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    setIsProcessing(true);
    setStatus("processing");
    setLoadingProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdfFile', file);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(`${API_BASE_URL}/api/tools/pdf-editor/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload result:', result); // Debug log
      
      if (result.success) {
        setSessionId(result.sessionId);
        setTotalPages(result.totalPages);
        setPdfStructure(result.structure);
        setCurrentPage(1);
        setLoadingProgress(100);
        
        setTimeout(() => {
          setStatus("editor");
          if (result.structure && result.structure.pages && result.structure.pages[0]) {
            console.log('Page structure to render:', result.structure.pages[0]);
            renderStructuredDOM(result.structure.pages[0]);
          } else {
            console.error('No page structure found in response:', result);
            alert('No page structure found in the response');
          }
        }, 500);
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (err) {
      console.error("Upload error:", err);
      alert("Error processing PDF: " + err.message);
      setStatus("upload");
    } finally {
      setIsProcessing(false);
      setLoadingProgress(0);
    }
  };

  // Render structured DOM from backend data - IMPROVED VERSION
  const renderStructuredDOM = (pageStructure) => {
    if (!domCanvasRef.current || !pageStructure) {
      console.warn('No DOM canvas or page structure available', { 
        domCanvas: !!domCanvasRef.current, 
        pageStructure: !!pageStructure 
      });
      return;
    }

    try {
      console.log('Rendering page structure:', pageStructure);
      
      // Clear existing content
      domCanvasRef.current.innerHTML = '';

      // Set container dimensions from backend data
      const containerWidth = pageStructure.width || 800;
      const containerHeight = pageStructure.height || 1000;
      
      domCanvasRef.current.style.width = `${containerWidth}px`;
      domCanvasRef.current.style.height = `${containerHeight}px`;
      domCanvasRef.current.style.position = 'relative';
      domCanvasRef.current.style.background = 'white';
      domCanvasRef.current.style.border = '1px solid #ccc';
      domCanvasRef.current.style.overflow = 'visible';
      domCanvasRef.current.style.margin = '0 auto';

      // Create layers container
      const layersContainer = document.createElement('div');
      layersContainer.className = 'layers-container';
      layersContainer.style.position = 'absolute';
      layersContainer.style.top = '0';
      layersContainer.style.left = '0';
      layersContainer.style.width = '100%';
      layersContainer.style.height = '100%';
      layersContainer.style.pointerEvents = 'none';
      domCanvasRef.current.appendChild(layersContainer);

      // Render all layers from backend data with better error handling
      if (pageStructure.layers) {
        console.log('Available layers:', Object.keys(pageStructure.layers));
        
        // Render in correct z-order
        renderLayer('background', pageStructure.layers.background || [], layersContainer, 1);
        renderLayer('shapes', pageStructure.layers.shapes || [], layersContainer, 2);
        renderLayer('images', pageStructure.layers.images || [], layersContainer, 3);
        renderLayer('tables', pageStructure.layers.tables || [], layersContainer, 4);
        renderLayer('text', pageStructure.layers.text || [], layersContainer, 5);
        renderLayer('annotations', pageStructure.layers.annotations || [], layersContainer, 6);
      } else {
        console.warn('No layers found in page structure');
      }

      addInteractivity();
      console.log('DOM rendering completed');

    } catch (error) {
      console.error('Error rendering DOM:', error);
    }
  };

  // Render a specific layer - IMPROVED VERSION
  const renderLayer = (layerType, elements, container, zIndex) => {
    if (!elements || elements.length === 0) {
      console.log(`No ${layerType} elements to render`);
      return;
    }

    console.log(`Rendering ${elements.length} ${layerType} elements`);
    
    const layer = document.createElement('div');
    layer.className = `${layerType}-layer`;
    layer.style.position = 'absolute';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.width = '100%';
    layer.style.height = '100%';
    layer.style.zIndex = zIndex;
    layer.style.pointerEvents = 'none';
    container.appendChild(layer);

    elements.forEach((element, index) => {
      try {
        renderElement(element, layer, layerType, index);
      } catch (error) {
        console.error(`Error rendering ${layerType} element ${index}:`, error);
      }
    });
  };

  // Render individual element - IMPROVED VERSION
  const renderElement = (element, container, layerType, index) => {
    const elementEl = document.createElement(element.tag || 'div');
    
    elementEl.id = element.id || `${layerType}-${index}`;
    elementEl.dataset.type = element.type;
    elementEl.dataset.layer = layerType;
    elementEl.dataset.page = element.page;
    elementEl.className = `pdf-element ${layerType}-element`;

    // Apply basic positioning styles
    const x = element.x || 0;
    const y = element.y || 0;
    const width = element.width || 100;
    const height = element.height || 20;

    elementEl.style.position = 'absolute';
    elementEl.style.left = `${x}px`;
    elementEl.style.top = `${y}px`;
    elementEl.style.width = `${width}px`;
    elementEl.style.height = `${height}px`;
    elementEl.style.pointerEvents = 'auto';
    elementEl.style.boxSizing = 'border-box';

    // Apply custom styles from backend if available
    if (element.style && typeof element.style === 'object') {
      Object.keys(element.style).forEach(styleKey => {
        if (typeof element.style[styleKey] === 'string') {
          elementEl.style[styleKey] = element.style[styleKey];
        }
      });
    }

    // Set content
    if (element.content) {
      elementEl.textContent = element.content;
    } else if (element.originalContent) {
      elementEl.textContent = element.originalContent;
    }

    // Add specific element type handling
    switch (element.type) {
      case 'text':
        makeTextEditable(elementEl, element);
        // Ensure text is visible
        elementEl.style.color = element.color || '#000000';
        elementEl.style.fontSize = element.fontSize ? `${element.fontSize}px` : '12px';
        elementEl.style.fontFamily = element.fontName || 'Arial, sans-serif';
        elementEl.style.whiteSpace = 'pre-wrap';
        elementEl.style.overflow = 'visible';
        break;
        
      case 'image':
        enhanceImageElement(elementEl, element);
        break;
        
      case 'table':
        enhanceTableElement(elementEl, element);
        break;
        
      case 'annotation':
        enhanceAnnotationElement(elementEl, element);
        break;
        
      case 'shape':
        enhanceShapeElement(elementEl, element);
        break;
        
      default:
        elementEl.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
        elementEl.style.border = '1px dashed #999';
    }

    container.appendChild(elementEl);
    console.log(`Rendered ${element.type} element at (${x}, ${y})`);
  };

  // Make text elements editable
  const makeTextEditable = (elementEl, element) => {
    elementEl.contentEditable = true;
    elementEl.style.cursor = 'text';
    elementEl.style.background = 'transparent';
    elementEl.style.border = '1px solid transparent';
    elementEl.style.padding = '2px';
    elementEl.style.minHeight = '16px';

    elementEl.addEventListener('mouseenter', () => {
      elementEl.style.background = 'rgba(255, 255, 0, 0.2)';
      elementEl.style.border = '1px dashed #0066cc';
    });

    elementEl.addEventListener('mouseleave', () => {
      if (!elementEl.isSameNode(document.activeElement)) {
        elementEl.style.background = 'transparent';
        elementEl.style.border = '1px solid transparent';
      }
    });

    elementEl.addEventListener('focus', () => {
      elementEl.style.background = 'rgba(255, 255, 0, 0.3)';
      elementEl.style.border = '1px solid #0066cc';
      setSelectedElement(element);
    });

    elementEl.addEventListener('blur', () => {
      elementEl.style.background = 'transparent';
      elementEl.style.border = '1px solid transparent';
      saveTextEdit(element.id, elementEl.textContent);
    });

    elementEl.addEventListener('input', (e) => {
      handleTextEdit(element.id, e.target.textContent);
    });
  };

  // Enhance image elements
  const enhanceImageElement = (elementEl, element) => {
    elementEl.style.cursor = 'move';
    elementEl.style.border = '2px solid #ff4444';
    elementEl.style.background = 'rgba(255, 68, 68, 0.1)';
    elementEl.style.display = 'flex';
    elementEl.style.alignItems = 'center';
    elementEl.style.justifyContent = 'center';
    elementEl.style.overflow = 'hidden';

    // Load image if URL is provided
    if (element.imageUrl) {
      const img = document.createElement('img');
      img.src = `${API_BASE_URL}${element.imageUrl}`;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      elementEl.appendChild(img);
    } else if (element.imageData) {
      const img = document.createElement('img');
      img.src = element.imageData;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      elementEl.appendChild(img);
    } else {
      // Placeholder for images
      elementEl.innerHTML = '<div style="color: #ff4444; font-size: 12px; text-align: center;">IMAGE</div>';
    }

    elementEl.addEventListener('mouseenter', () => {
      elementEl.style.boxShadow = '0 4px 16px rgba(255, 68, 68, 0.4)';
    });

    elementEl.addEventListener('mouseleave', () => {
      elementEl.style.boxShadow = 'none';
    });
  };

  // Enhance table elements
  const enhanceTableElement = (elementEl, element) => {
    elementEl.style.cursor = 'move';
    elementEl.style.border = '2px solid #0066cc';
    elementEl.style.background = 'rgba(0, 102, 204, 0.05)';
    elementEl.style.padding = '5px';
    elementEl.style.overflow = 'auto';

    // Create table structure if rows data exists
    if (element.rows && element.rows.length > 0) {
      const tableContent = document.createElement('div');
      tableContent.style.width = '100%';
      tableContent.style.height = '100%';
      tableContent.style.background = 'rgba(255, 255, 255, 0.95)';
      tableContent.style.borderRadius = '4px';
      tableContent.style.overflow = 'hidden';
      tableContent.style.fontSize = '10px';

      element.rows.forEach((row, rowIndex) => {
        const rowEl = document.createElement('div');
        rowEl.style.display = 'flex';
        rowEl.style.borderBottom = rowIndex < element.rows.length - 1 ? '1px solid #e0e0e0' : 'none';
        
        row.cells.forEach((cell, cellIndex) => {
          const cellEl = document.createElement('div');
          cellEl.style.flex = '1';
          cellEl.style.padding = '2px 4px';
          cellEl.style.borderRight = cellIndex < row.cells.length - 1 ? '1px solid #e0e0e0' : 'none';
          cellEl.style.fontSize = '10px';
          cellEl.style.overflow = 'hidden';
          cellEl.style.textOverflow = 'ellipsis';
          cellEl.style.whiteSpace = 'nowrap';
          cellEl.textContent = cell.content || '';
          cellEl.title = cell.content || '';
          rowEl.appendChild(cellEl);
        });

        tableContent.appendChild(rowEl);
      });

      elementEl.appendChild(tableContent);
    } else {
      elementEl.innerHTML = '<div style="color: #0066cc; font-size: 12px; text-align: center;">TABLE</div>';
    }

    elementEl.addEventListener('mouseenter', () => {
      elementEl.style.boxShadow = '0 4px 16px rgba(0, 102, 204, 0.3)';
    });

    elementEl.addEventListener('mouseleave', () => {
      elementEl.style.boxShadow = 'none';
    });
  };

  // Enhance annotation elements
  const enhanceAnnotationElement = (elementEl, element) => {
    elementEl.style.cursor = 'pointer';
    elementEl.style.border = '1px dotted #00aa00';
    elementEl.style.background = 'rgba(0, 170, 0, 0.1)';
    elementEl.style.display = 'flex';
    elementEl.style.alignItems = 'center';
    elementEl.style.justifyContent = 'center';
    elementEl.style.fontSize = '10px';
    elementEl.style.color = '#006400';
    
    if (!element.content) {
      elementEl.innerHTML = `
        <div style="text-align: center;">
          <div>💬</div>
          <div>${element.annotationType || 'Annotation'}</div>
        </div>
      `;
    }

    elementEl.addEventListener('mouseenter', () => {
      elementEl.style.boxShadow = '0 2px 12px rgba(0, 170, 0, 0.3)';
    });

    elementEl.addEventListener('mouseleave', () => {
      elementEl.style.boxShadow = 'none';
    });
  };

  // Enhance shape elements
  const enhanceShapeElement = (elementEl, element) => {
    elementEl.style.border = '1px solid #888';
    elementEl.style.background = 'rgba(136, 136, 136, 0.1)';
    elementEl.style.display = 'flex';
    elementEl.style.alignItems = 'center';
    elementEl.style.justifyContent = 'center';
    elementEl.innerHTML = '<div style="color: #666; font-size: 10px;">SHAPE</div>';
  };

  // Add interactivity to elements
  const addInteractivity = () => {
    const allElements = domCanvasRef.current.querySelectorAll('.pdf-element');
    console.log(`Added interactivity to ${allElements.length} elements`);
    
    allElements.forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const elementType = el.dataset.type;
        const elementId = el.id;
        
        setSelectedElement({
          id: elementId,
          type: elementType,
          element: el
        });
        
        console.log(`Selected element: ${elementType} (${elementId})`);
      });
    });

    // Canvas click to deselect
    domCanvasRef.current.addEventListener('click', (e) => {
      if (e.target === domCanvasRef.current) {
        setSelectedElement(null);
      }
    });
  };

  // Handle text editing
  const handleTextEdit = (elementId, newContent) => {
    console.log(`Editing text for ${elementId}:`, newContent);
    
    // Update local state immediately for responsive editing
    setPdfStructure(prev => {
      const updated = { ...prev };
      updated.pages = updated.pages.map(page => ({
        ...page,
        layers: {
          ...page.layers,
          text: page.layers.text.map(textEl => 
            textEl.id === elementId 
              ? { ...textEl, content: newContent }
              : textEl
          )
        }
      }));
      return updated;
    });
  };

  // Save text edits to backend
  const saveTextEdit = async (elementId, newContent) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tools/pdf-editor/update-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          elementId,
          newContent
        })
      });

      if (!response.ok) {
        console.error('Failed to save text edit');
      } else {
        console.log('Text edit saved successfully');
      }
    } catch (error) {
      console.error('Error saving text edit:', error);
    }
  };

  // Navigation
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      const pageStructure = pdfStructure.pages[pageNum - 1];
      if (pageStructure) {
        renderStructuredDOM(pageStructure);
      }
    }
  };

  // Export PDF
  const handleExport = async () => {
    if (!sessionId) {
      alert('No session ID found. Please upload a PDF first.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tools/pdf-editor/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          structure: pdfStructure
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited-document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting PDF: ' + error.message);
    }
  };

  // Render current page
  useEffect(() => {
    if (status === "editor" && pdfStructure.pages.length > 0) {
      const pageStructure = pdfStructure.pages[currentPage - 1];
      if (pageStructure) {
        renderStructuredDOM(pageStructure);
      }
    }
  }, [currentPage, status, pdfStructure]);

  // Get current page structure for display
  const getCurrentPageStructure = () => {
    return pdfStructure.pages[currentPage - 1] || { layers: {} };
  };

  const currentPageStructure = getCurrentPageStructure();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <File className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                PDF Editor
              </h1>
            </div>
            
            {status === "editor" && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {status === "upload" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="text-center max-w-md">
              <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload PDF to Edit
              </h2>
              <p className="text-gray-600 mb-6">
                Upload a PDF document to extract and edit text, images, tables, and annotations.
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                disabled={isProcessing}
              >
                <UploadCloud className="h-5 w-5 mr-2" />
                {isProcessing ? "Processing..." : "Choose PDF File"}
              </button>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="text-center max-w-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing PDF...
              </h3>
              <p className="text-gray-600 mb-4">
                Extracting text, images, tables, and annotations from your document.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {loadingProgress}% complete
              </p>
            </div>
          </div>
        )}

        {status === "editor" && (
          <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* Stats Bar */}
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
              <div className="max-w-7xl mx-auto flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded border border-red-600"></div>
                  <span>Images: {currentPageStructure.layers.images?.length || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded border border-green-600"></div>
                  <span>Text: {currentPageStructure.layers.text?.length || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded border border-blue-600"></div>
                  <span>Tables: {currentPageStructure.layers.tables?.length || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded border border-yellow-600"></div>
                  <span>Annotations: {currentPageStructure.layers.annotations?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-4">
                <button
                  onClick={() => setActiveTool("select")}
                  className={`p-2 rounded ${activeTool === "select" ? "bg-blue-100 text-blue-600" : "text-gray-600"}`}
                  title="Select"
                >
                  <MousePointer className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveTool("text")}
                  className={`p-2 rounded ${activeTool === "text" ? "bg-blue-100 text-blue-600" : "text-gray-600"}`}
                  title="Text"
                >
                  <Type className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveTool("image")}
                  className={`p-2 rounded ${activeTool === "image" ? "bg-blue-100 text-blue-600" : "text-gray-600"}`}
                  title="Images"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveTool("table")}
                  className={`p-2 rounded ${activeTool === "table" ? "bg-blue-100 text-blue-600" : "text-gray-600"}`}
                  title="Tables"
                >
                  <Table className="h-5 w-5" />
                </button>
              </div>

              {/* Main Editor */}
              <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="bg-white border-b p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setScale(Math.max(0.3, scale - 0.1))}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-medium">
                        {Math.round(scale * 100)}%
                      </span>
                      <button
                        onClick={() => setScale(Math.min(2, scale + 0.1))}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {selectedElement && (
                    <div className="text-sm text-gray-600">
                      Selected: {selectedElement.type} ({selectedElement.id})
                    </div>
                  )}
                </div>

                {/* Canvas */}
                <div className="flex-1 bg-gray-200 overflow-auto p-4" ref={containerRef}>
                  <div 
                    className="bg-white shadow-lg mx-auto"
                    style={{ 
                      transform: `scale(${scale})`,
                      transformOrigin: 'center top',
                    }}
                  >
                    <div
                      ref={domCanvasRef}
                      className="transition-transform duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PDFEditor;