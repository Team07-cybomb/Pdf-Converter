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
  Download,
  RefreshCw,
  PenTool,
  Square,
  Circle,
  Triangle,
  Minus,
  X,
  Move,
} from "lucide-react";

const API_BASE_URL = 'http://localhost:5000';

// Font pre-loader component
const FontPreloader = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      const fontFamilies = [
        'Arial, sans-serif',
        'Helvetica, sans-serif',
        'Times New Roman, serif',
        'Courier New, monospace',
        'Georgia, serif',
        'Verdana, sans-serif'
      ];

      // Pre-load fonts by creating hidden elements
      const loadPromises = fontFamilies.map(fontFamily => {
        return new Promise((resolve) => {
          const div = document.createElement('div');
          div.innerHTML = 'Font Load Test';
          div.style.position = 'absolute';
          div.style.left = '-9999px';
          div.style.top = '-9999px';
          div.style.fontFamily = fontFamily;
          div.style.fontSize = '16px';
          div.style.opacity = '0';
          document.body.appendChild(div);
          
          // Force font rendering
          setTimeout(() => {
            document.body.removeChild(div);
            resolve();
          }, 100);
        });
      });

      await Promise.all(loadPromises);
      setFontsLoaded(true);
    };

    loadFonts();
  }, []);

  return null;
};

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
    fonts: {},
    images: {}
  });
  const [selectedElement, setSelectedElement] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [edits, setEdits] = useState({});
  const [userElements, setUserElements] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [signature, setSignature] = useState("");
  const [showSignaturePopup, setShowSignaturePopup] = useState(false);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [signaturePaths, setSignaturePaths] = useState([]);

  const fileInputRef = useRef();
  const canvasRef = useRef();
  const containerRef = useRef();
  const drawingCanvasRef = useRef();
  const signatureCanvasRef = useRef();

  // File upload handler
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
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSessionId(result.sessionId);
        setTotalPages(result.totalPages);
        setPdfStructure(result.structure);
        setCurrentPage(1);
        setLoadingProgress(100);
        
        // Load saved edits for this session
        loadSavedEdits(result.sessionId);
        
        setTimeout(() => {
          setStatus("editor");
          renderCurrentPage();
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

  // Load saved edits from session
  const loadSavedEdits = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tools/pdf-editor/get-edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.edits) {
          setEdits(result.edits.text || {});
          setUserElements(result.edits.elements || {});
        }
      }
    } catch (error) {
      console.error('Error loading saved edits:', error);
    }
  };

  // Render current page with all elements
  const renderCurrentPage = () => {
    if (!canvasRef.current || !pdfStructure.pages[currentPage - 1]) return;

    const pageStructure = pdfStructure.pages[currentPage - 1];
    const canvas = canvasRef.current;
    
    // Clear canvas
    canvas.innerHTML = '';

    // Set canvas dimensions exactly as the PDF page
    canvas.style.width = `${pageStructure.width}px`;
    canvas.style.height = `${pageStructure.height}px`;
    canvas.style.position = 'relative';
    canvas.style.background = 'white';
    canvas.style.overflow = 'hidden'; // Prevent scrolling
    canvas.style.boxSizing = 'border-box';

    // Add background image
    const backgroundImg = document.createElement('img');
    backgroundImg.src = `${API_BASE_URL}/api/tools/pdf-editor/background/${sessionId}/page-${currentPage}.png`;
    backgroundImg.style.position = 'absolute';
    backgroundImg.style.top = '0';
    backgroundImg.style.left = '0';
    backgroundImg.style.width = '100%';
    backgroundImg.style.height = '100%';
    backgroundImg.style.pointerEvents = 'none';
    backgroundImg.style.zIndex = '1';
    backgroundImg.style.objectFit = 'contain';
    canvas.appendChild(backgroundImg);

    // Add editable text overlays
    if (pageStructure.elements && pageStructure.elements.text) {
      pageStructure.elements.text.forEach((textElement, index) => {
        const textDiv = createTextOverlay(textElement);
        canvas.appendChild(textDiv);
      });
    }

    // Add user-created elements
    const pageElements = userElements[currentPage] || [];
    pageElements.forEach((element, index) => {
      const elementDiv = createUserElement(element);
      canvas.appendChild(elementDiv);
    });

    // Initialize drawing canvas with exact dimensions
    initDrawingCanvas();
  };

  // Create editable text overlay
  const createTextOverlay = (textElement) => {
    const div = document.createElement('div');
    div.id = textElement.id;
    div.className = 'text-overlay editable';
    div.setAttribute('data-type', 'text');
    div.setAttribute('data-original', textElement.originalContent);

    const pos = textElement.position;
    div.style.position = 'absolute';
    div.style.left = `${pos.x}px`;
    div.style.top = `${pos.y}px`;
    div.style.width = `${pos.width}px`;
    div.style.height = `${pos.height}px`;
    div.style.zIndex = '10';
    div.style.background = 'transparent';
    div.style.border = 'none';
    div.style.boxSizing = 'border-box';

    const style = textElement.style;
    div.style.fontSize = `${style.fontSize}px`;
    div.style.fontFamily = style.fontFamily;
    div.style.fontWeight = style.fontWeight;
    div.style.color = style.color;
    div.style.textAlign = style.textAlign;
    div.style.lineHeight = style.lineHeight;
    div.style.whiteSpace = style.whiteSpace;
    div.style.pointerEvents = 'auto';
    div.style.cursor = 'text';
    div.style.padding = '0';
    div.style.margin = '0';

    const editedContent = edits[textElement.id];
    div.textContent = editedContent || textElement.content;

    div.contentEditable = true;
    div.style.outline = 'none';

    div.addEventListener('focus', () => {
      setSelectedElement(textElement);
      div.style.background = 'rgba(255, 255, 0, 0.2)';
      div.style.border = '1px dashed #666';
    });

    div.addEventListener('blur', () => {
      saveTextEdit(textElement.id, div.textContent);
      div.style.background = 'transparent';
      div.style.border = 'none';
    });

    div.addEventListener('input', () => {
      handleTextEdit(textElement.id, div.textContent);
    });

    div.addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedElement(textElement);
    });

    return div;
  };

  // Create user-added elements (shapes, images, signatures)
  const createUserElement = (element) => {
    const div = document.createElement('div');
    div.id = element.id;
    div.className = `user-element ${element.type}`;
    div.setAttribute('data-type', element.type);

    div.style.position = 'absolute';
    div.style.left = `${element.x}px`;
    div.style.top = `${element.y}px`;
    div.style.zIndex = '15';
    div.style.pointerEvents = 'auto';
    div.style.cursor = 'move';
    div.style.boxSizing = 'border-box';

    switch (element.type) {
      case 'rectangle':
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        div.style.border = '2px solid #000';
        div.style.background = 'transparent';
        break;
      
      case 'circle':
        div.style.width = `${element.width}px`;
        div.style.height = `${element.width}px`;
        div.style.border = '2px solid #000';
        div.style.borderRadius = '50%';
        div.style.background = 'transparent';
        break;
      
      case 'line':
        div.style.width = `${element.width}px`;
        div.style.height = '2px';
        div.style.background = '#000';
        div.style.transform = `rotate(${element.rotation || 0}deg)`;
        break;
      
      case 'signature':
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        if (element.src) {
          div.style.background = `url(${element.src}) no-repeat center center`;
          div.style.backgroundSize = 'contain';
        }
        div.style.border = '1px dashed #ccc';
        break;
      
      case 'image':
        div.style.width = `${element.width}px`;
        div.style.height = `${element.height}px`;
        if (element.src) {
          div.style.background = `url(${element.src}) no-repeat center center`;
          div.style.backgroundSize = 'contain';
        }
        div.style.border = '1px dashed #ccc';
        break;
      
      case 'text':
        div.style.fontSize = `${element.fontSize || 16}px`;
        div.style.color = element.color || '#000';
        div.style.background = 'transparent';
        div.style.padding = '4px';
        div.style.border = '1px dashed #ccc';
        div.style.minWidth = '50px';
        div.style.minHeight = '20px';
        div.style.fontFamily = element.fontFamily || 'Arial, sans-serif';
        div.textContent = element.text || 'Click to edit';
        break;
    }

    // Make element draggable
    div.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      setSelectedElement(element);
      startDrag(element, e);
    });

    // Make text elements editable
    if (element.type === 'text') {
      div.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        div.contentEditable = true;
        div.focus();
      });

      div.addEventListener('blur', () => {
        div.contentEditable = false;
        updateElementContent(element.id, div.textContent);
      });
    }

    // Add resize handles for resizable elements
    if (['rectangle', 'circle', 'image', 'signature', 'text'].includes(element.type)) {
      addResizeHandles(div, element);
    }

    return div;
  };

  // Initialize drawing canvas
  const initDrawingCanvas = () => {
    if (!canvasRef.current || !drawingCanvasRef.current) return;

    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const pageStructure = pdfStructure.pages[currentPage - 1];

    if (!pageStructure) return;

    drawingCanvas.width = pageStructure.width;
    drawingCanvas.height = pageStructure.height;

    drawingCanvas.style.position = 'absolute';
    drawingCanvas.style.top = '0';
    drawingCanvas.style.left = '0';
    drawingCanvas.style.width = '100%';
    drawingCanvas.style.height = '100%';
    drawingCanvas.style.zIndex = '20';
    drawingCanvas.style.pointerEvents = activeTool === 'draw' ? 'auto' : 'none';
    drawingCanvas.style.cursor = activeTool === 'draw' ? 'crosshair' : 'default';

    const ctx = drawingCanvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // Add resize handles to elements
  const addResizeHandles = (elementDiv, element) => {
    const handles = ['nw', 'ne', 'sw', 'se'];
    
    handles.forEach(handle => {
      const handleDiv = document.createElement('div');
      handleDiv.className = `resize-handle resize-${handle}`;
      handleDiv.style.position = 'absolute';
      handleDiv.style.width = '8px';
      handleDiv.style.height = '8px';
      handleDiv.style.background = '#000';
      handleDiv.style.border = '1px solid #fff';
      handleDiv.style.zIndex = '20';
      handleDiv.style.cursor = `${handle}-resize`;

      switch (handle) {
        case 'nw': handleDiv.style.top = '-4px'; handleDiv.style.left = '-4px'; break;
        case 'ne': handleDiv.style.top = '-4px'; handleDiv.style.right = '-4px'; break;
        case 'sw': handleDiv.style.bottom = '-4px'; handleDiv.style.left = '-4px'; break;
        case 'se': handleDiv.style.bottom = '-4px'; handleDiv.style.right = '-4px'; break;
      }

      handleDiv.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        startResize(element, handle, e);
      });

      elementDiv.appendChild(handleDiv);
    });
  };

  // Start dragging element
  const startDrag = (element, e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - element.x;
    const offsetY = e.clientY - rect.top - element.y;
    
    const handleMouseMove = (moveEvent) => {
      const newX = moveEvent.clientX - rect.left - offsetX;
      const newY = moveEvent.clientY - rect.top - offsetY;
      
      updateElementPosition(element.id, newX, newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Start resizing element
  const startResize = (element, handle, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startXPos = element.x;
    const startYPos = element.y;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;
      let newY = startYPos;

      if (handle.includes('e')) newWidth = Math.max(20, startWidth + deltaX);
      if (handle.includes('w')) {
        newWidth = Math.max(20, startWidth - deltaX);
        newX = startXPos + deltaX;
      }
      if (handle.includes('s')) newHeight = Math.max(20, startHeight + deltaY);
      if (handle.includes('n')) {
        newHeight = Math.max(20, startHeight - deltaY);
        newY = startYPos + deltaY;
      }

      updateElementSizeAndPosition(
        element.id, 
        newWidth, 
        newHeight,
        newX,
        newY
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Update element position
  const updateElementPosition = (elementId, x, y) => {
    setUserElements(prev => {
      const newElements = { ...prev };
      const pageElements = newElements[currentPage] || [];
      newElements[currentPage] = pageElements.map(el => 
        el.id === elementId ? { ...el, x, y } : el
      );
      return newElements;
    });
  };

  // Update element size and position
  const updateElementSizeAndPosition = (elementId, width, height, x, y) => {
    setUserElements(prev => {
      const newElements = { ...prev };
      const pageElements = newElements[currentPage] || [];
      newElements[currentPage] = pageElements.map(el => 
        el.id === elementId ? { ...el, width, height, x, y } : el
      );
      return newElements;
    });
  };

  // Update element content
  const updateElementContent = (elementId, text) => {
    setUserElements(prev => {
      const newElements = { ...prev };
      const pageElements = newElements[currentPage] || [];
      newElements[currentPage] = pageElements.map(el => 
        el.id === elementId ? { ...el, text } : el
      );
      return newElements;
    });
  };

  // Handle canvas click for adding elements at click position
  const handleCanvasClick = (e) => {
    if (activeTool === 'select') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Don't add element if clicking on existing element or resize handle
    if (e.target !== canvas && 
        e.target !== drawingCanvasRef.current && 
        !e.target.classList.contains('resize-handle')) {
      return;
    }

    switch (activeTool) {
      case 'text':
        addElementAtPosition('text', x, y, {
          text: 'New Text',
          fontSize: 16,
          width: 100,
          height: 30,
          fontFamily: 'Arial, sans-serif'
        });
        break;
      case 'rectangle':
        addElementAtPosition('rectangle', x, y, {
          width: 150,
          height: 100
        });
        break;
      case 'circle':
        addElementAtPosition('circle', x, y, {
          width: 100,
          height: 100
        });
        break;
      case 'line':
        addElementAtPosition('line', x, y, {
          width: 150,
          height: 2
        });
        break;
    }

    // Reset to select tool after placing element
    setActiveTool('select');
  };

  // Add element at specific position
  const addElementAtPosition = (type, x, y, options = {}) => {
    const newElement = {
      id: `${type}-${Date.now()}`,
      type,
      x: x - (options.width || 100) / 2, // Center the element
      y: y - (options.height || 100) / 2,
      width: options.width || 100,
      height: options.height || 100,
      ...options
    };

    setUserElements(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), newElement]
    }));

    setSelectedElement(newElement);
    
    // Re-render to show the new element with drag handles
    setTimeout(() => {
      renderCurrentPage();
    }, 0);
  };

  // Handle text editing
  const handleTextEdit = (elementId, newContent) => {
    setEdits(prev => ({
      ...prev,
      [elementId]: newContent
    }));
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
        throw new Error('Failed to save text edit');
      }
    } catch (error) {
      console.error('Error saving text edit:', error);
    }
  };

  // Add new element
  const addElement = (type, options = {}) => {
    // Set active tool to the element type so user can click to place it
    setActiveTool(type);
  };

  // Enhanced canvas capture with better font handling
  const captureAllPagesAsCanvas = async () => {
    const canvasData = {};
    const originalPage = currentPage;
    
    // Create a temporary canvas for rendering
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Set higher DPI for better quality
    const scaleFactor = 2; // 2x resolution for better text quality
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      setCurrentPage(pageNum);
      
      // Wait for page to render
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvasContainer = canvasRef.current;
      if (!canvasContainer) continue;
      
      const pageStructure = pdfStructure.pages[pageNum - 1];
      if (!pageStructure) continue;
      
      // Set high-resolution canvas
      tempCanvas.width = pageStructure.width * scaleFactor;
      tempCanvas.height = pageStructure.height * scaleFactor;
      
      // Clear and set white background
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Scale context for high DPI
      tempCtx.save();
      tempCtx.scale(scaleFactor, scaleFactor);
      
      // Capture with enhanced font handling
      await capturePageElements(tempCtx, canvasContainer, pageStructure, scaleFactor);
      
      tempCtx.restore();
      
      // Store as high-quality PNG
      canvasData[pageNum] = {
        dataURL: tempCanvas.toDataURL('image/png', 0.9),
        width: pageStructure.width,
        height: pageStructure.height
      };
      
      console.log(`Captured page ${pageNum} at ${scaleFactor}x resolution`);
    }
    
    setCurrentPage(originalPage);
    return canvasData;
  };

  // Enhanced element capture with font preservation
  const capturePageElements = async (ctx, container, pageStructure, scaleFactor = 1) => {
    // Draw background image first
    await drawBackgroundImage(ctx, pageStructure, scaleFactor);
    
    // Draw all DOM elements in correct order
    await drawAllDOMElements(ctx, container, scaleFactor);
  };

  // Draw background with high quality
  const drawBackgroundImage = async (ctx, pageStructure, scaleFactor) => {
    return new Promise((resolve) => {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        // Draw background at high quality
        ctx.drawImage(bgImg, 0, 0, pageStructure.width, pageStructure.height);
        resolve();
      };
      bgImg.onerror = () => {
        console.log('Background image failed to load, using white background');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, pageStructure.width, pageStructure.height);
        resolve();
      };
      bgImg.src = `${API_BASE_URL}${pageStructure.backgroundImage}?t=${Date.now()}`;
    });
  };

  // Draw all DOM elements with proper styling
  const drawAllDOMElements = async (ctx, container, scaleFactor) => {
    // Get all elements in the correct z-order
    const allElements = Array.from(container.querySelectorAll('*'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .sort((a, b) => {
        const aZ = parseInt(window.getComputedStyle(a).zIndex) || 0;
        const bZ = parseInt(window.getComputedStyle(b).zIndex) || 0;
        return aZ - bZ;
      });

    for (const element of allElements) {
      await drawElementToCanvas(ctx, element, container, scaleFactor);
    }
  };

  // Enhanced element drawing with font support
  const drawElementToCanvas = async (ctx, element, container, scaleFactor) => {
    const rect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;
    const width = rect.width;
    const height = rect.height;

    // Skip if element is not visible or has no size
    if (width === 0 || height === 0) return;

    ctx.save();

    try {
      const computedStyle = window.getComputedStyle(element);
      
      // Handle different element types
      if (element.classList.contains('text-overlay')) {
        await drawTextElement(ctx, element, x, y, width, height, computedStyle);
      } 
      else if (element.classList.contains('user-element')) {
        await drawUserElementToCanvas(ctx, element, x, y, width, height, computedStyle);
      }
      // Add other element types as needed
      
    } catch (error) {
      console.error('Error drawing element:', error);
    }

    ctx.restore();
  };

  // Enhanced text drawing with font fallbacks
  const drawTextElement = async (ctx, element, x, y, width, height, computedStyle) => {
    const textContent = element.textContent || '';
    if (!textContent.trim()) return;

    // Set up text styling
    ctx.font = getCanvasFontString(computedStyle);
    ctx.fillStyle = computedStyle.color || '#000000';
    ctx.textAlign = getCanvasTextAlign(computedStyle.textAlign);
    ctx.textBaseline = 'top';
    
    // Handle line breaks
    const lines = textContent.split('\n');
    const lineHeight = parseInt(computedStyle.lineHeight) || parseInt(computedStyle.fontSize);
    const fontSize = parseInt(computedStyle.fontSize);
    
    // Draw each line
    lines.forEach((line, index) => {
      if (line.trim()) {
        ctx.fillText(line, x, y + (index * lineHeight));
      }
    });
  };

  // Convert CSS font to canvas font string
  const getCanvasFontString = (computedStyle) => {
    const fontWeight = computedStyle.fontWeight || 'normal';
    const fontSize = computedStyle.fontSize || '16px';
    const fontFamily = computedStyle.fontFamily || 'Arial, sans-serif';
    
    // Map CSS font weights to canvas-friendly weights
    const weightMap = {
      'bold': 'bold',
      'bolder': 'bold',
      'lighter': 'lighter',
      '100': '100',
      '200': '200',
      '300': '300',
      '400': 'normal',
      '500': '500',
      '600': '600',
      '700': 'bold',
      '800': '800',
      '900': '900'
    };
    
    const canvasWeight = weightMap[fontWeight] || 'normal';
    const canvasStyle = computedStyle.fontStyle || 'normal';
    
    return `${canvasStyle} ${canvasWeight} ${fontSize} ${fontFamily}`;
  };

  // Convert CSS text-align to canvas textAlign
  const getCanvasTextAlign = (cssTextAlign) => {
    const alignMap = {
      'left': 'left',
      'right': 'right',
      'center': 'center',
      'justify': 'left' // canvas doesn't support justify
    };
    return alignMap[cssTextAlign] || 'left';
  };

  // Enhanced user element drawing
  const drawUserElementToCanvas = async (ctx, element, x, y, width, height, computedStyle) => {
    const type = element.getAttribute('data-type');
    
    switch (type) {
      case 'text':
        // Draw user text elements
        const textContent = element.textContent || 'Text';
        ctx.font = getCanvasFontString(computedStyle);
        ctx.fillStyle = computedStyle.color || '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(textContent, x, y);
        break;
        
      case 'rectangle':
        ctx.strokeStyle = computedStyle.borderColor || '#000000';
        ctx.lineWidth = parseInt(computedStyle.borderWidth) || 2;
        ctx.strokeRect(x, y, width, height);
        break;
        
      case 'circle':
        ctx.strokeStyle = computedStyle.borderColor || '#000000';
        ctx.lineWidth = parseInt(computedStyle.borderWidth) || 2;
        ctx.beginPath();
        ctx.arc(x + width/2, y + height/2, Math.min(width, height)/2, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'line':
        ctx.strokeStyle = computedStyle.backgroundColor || '#000000';
        ctx.lineWidth = parseInt(computedStyle.height) || 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
        break;
        
      case 'signature':
      case 'image':
        // Handle images and signatures
        await drawElementBackgroundImage(ctx, element, x, y, width, height);
        break;
    }
  };

  // Draw background images for elements
  const drawElementBackgroundImage = (ctx, element, x, y, width, height) => {
    return new Promise((resolve) => {
      const bgImage = window.getComputedStyle(element).backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, x, y, width, height);
          resolve();
        };
        img.onerror = () => {
          console.log('Element background image failed to load');
          resolve();
        };
        
        // Extract URL from background-image property
        const urlMatch = bgImage.match(/url\(["']?(.*?)["']?\)/);
        if (urlMatch) {
          img.src = urlMatch[1];
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  };

  // Enhanced export with canvas capture
  const handleExport = async () => {
    try {
      setIsProcessing(true);
      
      // First capture all canvas data for each page
      const canvasData = await captureAllPagesAsCanvas();
      
      // Then export with canvas data
      const response = await fetch(`${API_BASE_URL}/api/tools/pdf-editor/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          canvasData // Send canvas renders for each page
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-document-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('PDF exported successfully!');

    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply all edits and save to backend
  const handleApplyEdits = async () => {
    try {
      setIsProcessing(true);
      
      // Collect all current text edits from the DOM
      const textOverlays = document.querySelectorAll('.text-overlay.editable');
      const currentEdits = { ...edits };
      
      textOverlays.forEach(overlay => {
        const elementId = overlay.id;
        const currentContent = overlay.textContent || '';
        if (elementId && currentContent !== overlay.getAttribute('data-original')) {
          currentEdits[elementId] = currentContent;
        }
      });

      // Update state with current edits
      setEdits(currentEdits);

      const response = await fetch(`${API_BASE_URL}/api/tools/pdf-editor/apply-edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          edits: {
            text: currentEdits,
            elements: userElements
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply edits');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('All edits applied and saved successfully!');
        console.log('Edits saved:', {
          textEdits: Object.keys(currentEdits).length,
          userElements: Object.keys(userElements).length
        });
      } else {
        throw new Error(result.error || 'Failed to apply edits');
      }

    } catch (error) {
      console.error('Apply edits error:', error);
      alert('Error applying edits: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature drawing functions
  const startSignatureDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawingSignature(true);
    setSignaturePaths(prev => [...prev, [{ x, y }]]);

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const drawSignature = (e) => {
    if (!isDrawingSignature) return;

    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSignaturePaths(prev => {
      const newPaths = [...prev];
      newPaths[newPaths.length - 1].push({ x, y });
      return newPaths;
    });

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopSignatureDrawing = () => {
    setIsDrawingSignature(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignaturePaths([]);
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    const dataURL = canvas.toDataURL();
    
    // Add signature at a default position (user can drag it later)
    addElementAtPosition('signature', 200, 150, {
      src: dataURL,
      width: 200,
      height: 100
    });
    
    setShowSignaturePopup(false);
    clearSignature();
  };

  // Add signature from text
  const addTextSignature = () => {
    if (!signature.trim()) {
      alert('Please enter your signature');
      return;
    }

    addElementAtPosition('text', 200, 150, {
      text: signature,
      fontSize: 24,
      fontFamily: 'cursive',
      width: signature.length * 15,
      height: 30
    });
    setSignature("");
  };

  // Add image
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      addElementAtPosition('image', 200, 150, {
        src: e.target.result,
        width: 150,
        height: 150
      });
    };
    reader.readAsDataURL(file);
  };

  // Drawing functions
  const startDrawing = (e) => {
    if (activeTool !== 'draw') return;

    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || activeTool !== 'draw') return;

    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPath(prev => [...prev, { x, y }]);

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    
    // Save drawing as image element
    if (currentPath.length > 1) {
      const canvas = drawingCanvasRef.current;
      const dataURL = canvas.toDataURL();
      
      addElementAtPosition('image', 200, 150, {
        src: dataURL,
        width: 200,
        height: 150
      });

      // Clear drawing canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Reset editor
  const handleReset = () => {
    setStatus("upload");
    setCurrentPage(1);
    setTotalPages(0);
    setPdfStructure({ pages: [], metadata: {}, fonts: {}, images: {} });
    setSessionId(null);
    setSelectedElement(null);
    setEdits({});
    setUserElements({});
    
    if (canvasRef.current) {
      canvasRef.current.innerHTML = '';
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Navigation
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Zoom
  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));

  // Re-render when page changes or tools change
  useEffect(() => {
    if (status === "editor") {
      renderCurrentPage();
    }
  }, [currentPage, status, userElements]);

  // Update drawing canvas when tool changes
  useEffect(() => {
    if (drawingCanvasRef.current) {
      drawingCanvasRef.current.style.pointerEvents = activeTool === 'draw' ? 'auto' : 'none';
      drawingCanvasRef.current.style.cursor = activeTool === 'draw' ? 'crosshair' : 'default';
    }
  }, [activeTool]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add font preloader */}
      <FontPreloader />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PDF Editor</h1>
              <p className="text-gray-600">
                Edit PDFs with advanced tools
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {sessionId && (
                <span className="bg-gray-100 px-3 py-1 rounded">
                  Session: {sessionId?.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Popup */}
      {showSignaturePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Draw Your Signature</h3>
              <button
                onClick={() => setShowSignaturePopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4">
              <canvas
                ref={signatureCanvasRef}
                width={350}
                height={200}
                onMouseDown={startSignatureDrawing}
                onMouseMove={drawSignature}
                onMouseUp={stopSignatureDrawing}
                onMouseLeave={stopSignatureDrawing}
                className="w-full h-50 cursor-crosshair bg-white"
              />
            </div>
            
            <div className="flex justify-between gap-2">
              <button
                onClick={clearSignature}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear
              </button>
              <button
                onClick={saveSignature}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Signature
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Or use text signature:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Enter your signature"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={addTextSignature}
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Add Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {status === "upload" && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <File className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Upload PDF to Edit
            </h2>
            <p className="text-gray-500 mb-6 text-center">
              Upload a PDF file to start editing with advanced tools
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UploadCloud className="w-5 h-5" />
              {isProcessing ? "Processing..." : "Choose PDF File"}
            </button>
          </div>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <RefreshCw className="w-16 h-16 text-blue-600 mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Processing PDF...
            </h2>
            <p className="text-gray-500 mb-4 text-center">
              Preparing PDF for editing
            </p>
            <div className="w-full max-w-md bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{loadingProgress}%</p>
          </div>
        )}

        {status === "editor" && (
          <div className="flex flex-col h-[calc(100vh-200px)]">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  New PDF
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage <= 1}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={zoomOut}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
                  <button
                    onClick={zoomIn}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyEdits}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Save Edits
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar - Tools */}
              <div className="w-16 bg-gray-50 border-r border-gray-200 p-2 flex flex-col items-center gap-2">
                <button
                  onClick={() => setActiveTool("select")}
                  className={`p-3 rounded-lg ${
                    activeTool === "select" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Select"
                >
                  <MousePointer className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setActiveTool("text")}
                  className={`p-3 rounded-lg ${
                    activeTool === "text" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Text"
                >
                  <Type className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setActiveTool("draw")}
                  className={`p-3 rounded-lg ${
                    activeTool === "draw" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Draw"
                >
                  <PenTool className="w-5 h-5" />
                </button>

                <div className="border-t border-gray-300 my-2 w-full"></div>

                <button
                  onClick={() => setShowSignaturePopup(true)}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-lg"
                  title="Signature"
                >
                  <Move className="w-5 h-5" />
                </button>

                <button
                  onClick={() => addElement('rectangle')}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-lg"
                  title="Rectangle"
                >
                  <Square className="w-5 h-5" />
                </button>

                <button
                  onClick={() => addElement('circle')}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-lg"
                  title="Circle"
                >
                  <Circle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => addElement('line')}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-lg"
                  title="Line"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="border-t border-gray-300 my-2 w-full"></div>

                <button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="p-3 text-gray-600 hover:bg-gray-200 rounded-lg"
                  title="Add Image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Canvas Area */}
              <div className="flex-1 bg-gray-100 overflow-auto p-8 relative">
                <div 
                  ref={containerRef}
                  className="bg-white shadow-lg mx-auto relative"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center top',
                  }}
                >
                  <div
                    ref={canvasRef}
                    className="pdf-canvas relative"
                    style={{
                      background: 'white',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      cursor: activeTool !== 'select' ? 'crosshair' : 'default'
                    }}
                    onClick={handleCanvasClick}
                  />
                  <canvas
                    ref={drawingCanvasRef}
                    className="absolute top-0 left-0"
                  />
                </div>
              </div>

              {/* Right Sidebar - Add Elements */}
              <div className="w-80 bg-white border-l border-gray-200 p-4">
                <h3 className="font-semibold text-gray-700 mb-4">Add Elements</h3>
                
                {/* Active Tool Info */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Active Tool:</strong> {activeTool}
                  </p>
                  {activeTool !== 'select' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Click on the document to place the {activeTool}
                    </p>
                  )}
                </div>

                {/* Signature Tool */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Signature</h4>
                  <button
                    onClick={() => setShowSignaturePopup(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 mb-2"
                  >
                    Draw Signature
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Text signature"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={addTextSignature}
                      className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Quick Shapes */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Quick Shapes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => addElement('rectangle')}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Rectangle
                    </button>
                    <button
                      onClick={() => addElement('circle')}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Circle
                    </button>
                    <button
                      onClick={() => addElement('line')}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Line
                    </button>
                    <button
                      onClick={() => addElement('text')}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Text Box
                    </button>
                  </div>
                </div>

                {/* Edit Instructions */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 text-sm mb-2">Editing Tools:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Click on text to edit</li>
                    <li>• Click on empty space to add elements</li>
                    <li>• Drag elements to move them</li>
                    <li>• Use corners to resize elements</li>
                    <li>• Double-click text boxes to edit</li>
                    <li>• Save edits before exporting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFEditor;