import React, { useState, useRef, useEffect } from "react";
import {
  File,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  PenTool,
  Image,
  Edit,
  FileText,
  MousePointer,
  Save,
  Download,
} from "lucide-react";
const API_URL = import.meta.env.VITE_API_URL;

const API_BASE_URL = `${API_URL}/api`;

const PDFEditor = () => {
  const [status, setStatus] = useState("upload"); // upload | processing | editor
  const [fileData, setFileData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState("select");
  const [edits, setEdits] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textContent, setTextContent] = useState([]);
  const [selectedText, setSelectedText] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  const fileInputRef = useRef();
  const fileInputImageRef = useRef();
  const containerRef = useRef();

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // ===========================
  // Upload PDF - FIXED VERSION
  // ===========================
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

      // Upload PDF to backend
      const uploadResponse = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/upload`,
        { 
          method: "POST", 
          body: formData 
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success) {
        // Create blob URL for local PDF display
        const blobUrl = URL.createObjectURL(file);
        setPdfBlobUrl(blobUrl);
        
        setFileData({
          ...uploadResult,
          fileUrl: blobUrl
        });
        setTotalPages(uploadResult.totalPages);

        const sessionId = uploadResult.sessionId;

        // Extract text content
        await extractTextContent(sessionId);

        // Extract form fields
        await extractFormFields(sessionId);

        setStatus("editor");
      } else {
        throw new Error(uploadResult.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
      setStatus("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  // ===========================
  // Extract text content - FIXED
  // ===========================
  const extractTextContent = async (sessionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/extract-text`,
        {
          method: "POST",
          body: JSON.stringify({ sessionId }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTextContent(result.text || []);
      } else {
        console.warn("Text extraction failed, continuing without text...");
      }
    } catch (err) {
      console.error("Text extraction error:", err);
    }
  };

  // ===========================
  // Extract form fields - FIXED
  // ===========================
  const extractFormFields = async (sessionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/extract-forms/${sessionId}`
      );

      if (response.ok) {
        const result = await response.json();
        setFormFields(result.formFields || []);
      } else {
        console.warn("Form extraction failed, continuing without forms...");
      }
    } catch (err) {
      console.error("Form extraction error:", err);
    }
  };

  // ===========================
  // Text selection
  // ===========================
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = containerRef.current;

      if (container) {
        const containerRect = container.getBoundingClientRect();
        setSelectedText({
          text: selection.toString(),
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
          page: currentPage,
        });
      }
    }
  };

  // ===========================
  // Modify selected text
  // ===========================
  const handleModifyText = () => {
    if (!selectedText) {
      alert("Please select text first");
      return;
    }
    const newText = prompt("Modify text:", selectedText.text);
    if (newText && newText !== selectedText.text) {
      addEdit("modify-text", {
        originalText: selectedText.text,
        newText,
        x: selectedText.x,
        y: selectedText.y,
        page: selectedText.page,
      });
      setSelectedText(null);
      window.getSelection().removeAllRanges();
    }
  };

  // ===========================
  // Add new text
  // ===========================
  const handleAddText = () => {
    const text = prompt("Enter new text:");
    if (text && text.trim()) {
      addEdit("add-text", {
        content: text,
        x: 50,
        y: 100,
        fontSize: 12,
        color: "#000000",
        page: currentPage,
      });
    }
  };

  // ===========================
  // Insert image
  // ===========================
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
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    event.target.value = "";
  };

  // ===========================
  // Form field change
  // ===========================
  const handleFormFieldChange = (fieldId, value) => {
    setFormFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value } : f))
    );
    // Also store as edit for backend
    addEdit("form-field", { id: fieldId, value, page: currentPage });
  };

  // ===========================
  // Add edit
  // ===========================
  const addEdit = (type, data) => {
    const newEdit = { 
      id: Date.now() + Math.random(), 
      type, 
      ...data 
    };
    setEdits((prev) => [...prev, newEdit]);
  };

  // ===========================
  // Apply edits - FIXED
  // ===========================
  const applyEdits = async () => {
    if (!fileData) return;
    setIsProcessing(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/apply-edits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: fileData.sessionId,
            edits: edits.filter(edit => edit.type !== 'form-field'), // Filter form fields
            formFields: formFields.filter(field => field.value) // Only fields with values
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to apply edits");
      }

      const result = await response.json();
      if (result.success) {
        alert("PDF edited successfully! You can now download the edited version.");
      } else {
        throw new Error(result.error || "Apply edits failed");
      }
    } catch (err) {
      console.error("Apply edits error:", err);
      alert("Failed to apply edits: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ===========================
  // Download PDF - FIXED
  // ===========================
  const downloadEditedPDF = async () => {
    if (!fileData) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/download/${fileData.sessionId}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Download failed");
      }

      const blob = await response.blob();
      
      // Check if blob is valid PDF
      if (blob.type !== 'application/pdf') {
        throw new Error("Downloaded file is not a valid PDF");
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "edited-document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed: " + err.message);
    }
  };

  // ===========================
  // Render form fields
  // ===========================
  const renderFormFields = () => {
    if (!formFields || formFields.length === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <h4 className="font-semibold text-blue-800 mb-3">Form Fields:</h4>
        <div className="space-y-3">
          {formFields.map((field) => (
            <div key={field.id} className="flex items-center">
              <label className="text-sm font-medium text-blue-700 w-32 truncate">
                {field.name || field.id}:
              </label>
              <input
                type="text"
                className="flex-1 px-3 py-1 border border-blue-300 rounded text-sm"
                placeholder={`Enter ${field.type || "value"}`}
                onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                defaultValue={field.value || ""}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===========================
  // Render text content
  // ===========================
  const renderTextContent = () => {
    if (!textContent || textContent.length === 0) return null;

    const displayText = Array.isArray(textContent) ? textContent : [textContent];

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
        <h4 className="font-semibold text-gray-800 mb-2">Text Content:</h4>
        <div
          className="text-sm text-gray-600 max-h-32 overflow-y-auto leading-relaxed cursor-text"
          onMouseUp={handleTextSelection}
        >
          {displayText.map((item, index) => (
            <span key={index}>{typeof item === 'string' ? item : item.text} </span>
          ))}
        </div>
        {selectedText && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-sm text-yellow-800">
              Selected: "{selectedText.text}"
            </p>
            <button
              onClick={handleModifyText}
              className="mt-1 bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
            >
              Modify This Text
            </button>
          </div>
        )}
      </div>
    );
  };

  // ===========================
  // Toolbar buttons
  // ===========================
  const toolsList = [
    { name: "select", icon: MousePointer, hint: "Select Text" },
    { name: "modify-text", icon: Edit, hint: "Modify Selected Text" },
    { name: "add-text", icon: Type, hint: "Add New Text" },
    { name: "image", icon: Image, hint: "Insert Image" },
    { name: "forms", icon: FileText, hint: "Fill Forms" },
  ];

  // ===========================
  // Render upload screen
  // ===========================
  const renderUploadScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-8 max-w-md w-full text-center">
        <File className="w-16 h-16 mx-auto text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Advanced PDF Editor</h2>
        <p className="text-gray-600 mb-6">
          Modify text, add content, insert images, and fill forms
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
          {isProcessing ? "Uploading..." : "Choose PDF File"}
        </button>
      </div>
    </div>
  );

  // ===========================
  // Render processing screen
  // ===========================
  const renderProcessingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {status === "processing" ? "Processing PDF..." : "Applying Edits..."}
        </h3>
        <p className="text-gray-600">Please wait while we process your file</p>
      </div>
    </div>
  );

  // ===========================
  // Render editor
  // ===========================
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

            {/* Image Upload */}
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
        <div className="flex-1 bg-gray-200 p-4 overflow-auto flex justify-center">
          <div
            ref={containerRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden relative"
            style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
          >
            {pdfBlobUrl && (
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full min-h-[800px] border-0"
                title="PDF Viewer"
                type="application/pdf"
              />
            )}
          </div>
        </div>

        {/* Editing Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Editing Tools</h3>

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
                            edit.type === "modify-text"
                              ? "bg-purple-500"
                              : edit.type === "add-text"
                              ? "bg-blue-500"
                              : edit.type === "image"
                              ? "bg-green-500"
                              : edit.type === "form-field"
                              ? "bg-orange-500"
                              : "bg-gray-500"
                          }`}
                        ></span>
                        {edit.type === "modify-text" &&
                          `Modify: "${edit.originalText?.substring(0, 20)}..." → "${edit.newText?.substring(0, 20)}..."`}
                        {edit.type === "add-text" && `Add: "${edit.content?.substring(0, 30)}..."`}
                        {edit.type === "image" && `Insert Image`}
                        {edit.type === "form-field" && `Form: ${edit.value}`}
                      </span>
                      <button
                        onClick={() => setEdits((prev) => prev.filter((e) => e.id !== edit.id))}
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

            {/* Render text & form */}
            {renderTextContent()}
            {renderFormFields()}
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
          <p className="text-gray-600 mt-2">Modify text, insert images, fill forms - Real PDF content editing</p>
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