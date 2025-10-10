import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  File, UploadCloud, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Type, Highlighter, PenTool, Square, Save, MousePointer, Download,
  Image, Edit, FileText, Signature
} from 'lucide-react';
import SignaturePad from 'react-signature-canvas';

const API_BASE_URL = 'http://localhost:5000/api';

const PDFEditor = () => {
  const [status, setStatus] = useState('upload');
  const [fileData, setFileData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState('select');
  const [edits, setEdits] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textContent, setTextContent] = useState([]);
  const [selectedText, setSelectedText] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState([]);
  const [signModalOpen, setSignModalOpen] = useState(false);

  const fileInputRef = useRef();
  const canvasRef = useRef();
  const containerRef = useRef();
  const fileInputImageRef = useRef();
  const signaturePadRef = useRef({});

  const startDrawing = (event) => {
    if (activeTool === 'pen' || activeTool === 'highlight' || activeTool === 'square') {
      setIsDrawing(true);
      const { offsetX, offsetY } = event.nativeEvent;
      setDrawPath([{ x: offsetX, y: offsetY }]);
    }
  };

  const draw = (event) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = event.nativeEvent;
    setDrawPath(prevPath => [...prevPath, { x: offsetX, y: offsetY }]);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (drawPath.length > 1) {
      addEdit(activeTool, { path: drawPath, page: currentPage });
    }
    setDrawPath([]);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus('processing');

    try {
      const formData = new FormData();
      formData.append('pdfFile', file);
      
      const uploadUrl = file.name.endsWith('.pdf') 
        ? `${API_BASE_URL}/tools/pdf-editor/upload` 
        : `${API_BASE_URL}/tools/pdf-editor/convert-to-pdf`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      
      if (uploadResult.success) {
        setFileData(uploadResult);
        setTotalPages(uploadResult.totalPages);
        
        await extractTextContent(uploadResult.sessionId);
        await extractFormFields(uploadResult.sessionId);
        
        setStatus('editor');
        
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
      setStatus('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextContent = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tools/pdf-editor/extract-text/${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        setTextContent(result.textContent || []);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
    }
  };

  const extractFormFields = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tools/pdf-editor/extract-forms/${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        setFormFields(result.formFields || []);
      }
    } catch (error) {
      console.error('Form extraction error:', error);
    }
  };

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
          page: currentPage
        });
      }
    }
  };

  const handleModifyText = () => {
    if (!selectedText) {
      alert('Please select some text first by highlighting it.');
      return;
    }

    const newText = prompt('Modify text:', selectedText.text);
    if (newText && newText !== selectedText.text) {
      addEdit('modify-text', {
        originalText: selectedText.text,
        newText: newText,
        x: selectedText.x,
        y: selectedText.y,
        page: selectedText.page
      });
      setSelectedText(null);
      window.getSelection().removeAllRanges();
    }
  };

  const handleAddText = () => {
    const text = prompt('Enter new text:');
    if (text && text.trim()) {
      addEdit('add-text', {
        content: text,
        x: 50,
        y: 100,
        fontSize: 12,
        color: '#000000',
        page: currentPage
      });
    }
  };

  const handleInsertImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      addEdit('image', {
        imageData: e.target.result,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        page: currentPage
      });
    };
    reader.readAsDataURL(file);
  };
  
  const handleSignSave = () => {
    if (signaturePadRef.current.isEmpty()) {
      alert("Please provide a signature first.");
      return;
    }
    const signatureDataUrl = signaturePadRef.current.toDataURL();
    addEdit('signature', {
      imageData: signatureDataUrl,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      page: currentPage,
    });
    setSignModalOpen(false);
    signaturePadRef.current.clear();
  };

  const handleFormFieldChange = (fieldId, value) => {
    setFormFields(prevFields =>
      prevFields.map(field =>
        field.id === fieldId ? { ...field, value } : field
      )
    );
  };

  const addEdit = (type, data) => {
    const newEdit = {
      id: Date.now() + Math.random(),
      type,
      ...data,
      timestamp: new Date()
    };
    
    setEdits(prev => [...prev, newEdit]);
  };

  const applyEdits = async () => {
    if (!fileData) {
      alert('No file loaded');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/tools/pdf-editor/apply-edits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: fileData.sessionId,
          edits: edits,
          formFields: formFields
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert('PDF edited successfully! You can now download the file.');
      } else {
        throw new Error(result.error || 'Failed to apply edits');
      }
    } catch (error) {
      console.error('Apply edits error:', error);
      alert('Failed to apply edits: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadEditedPDF = async () => {
    if (!fileData) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/tools/pdf-editor/download/${fileData.sessionId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to download edited file');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited-document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download: ' + error.message);
    }
  };

  const tools = [
    { name: 'select', icon: MousePointer, hint: 'Select' },
    { name: 'modify-text', icon: Edit, hint: 'Modify Text' },
    { name: 'add-text', icon: Type, hint: 'Add New Text' },
    { name: 'highlight', icon: Highlighter, hint: 'Highlight Text' },
    { name: 'pen', icon: PenTool, hint: 'Draw' },
    { name: 'square', icon: Square, hint: 'Add Square' },
    { name: 'image', icon: Image, hint: 'Insert Image' },
    { name: 'signature', icon: Signature, hint: 'Add Signature' },
    { name: 'forms', icon: FileText, hint: 'Fill Forms' },
  ];

  const renderFormFields = () => {
    const pageFormFields = formFields;
    
    if (pageFormFields.length === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <h4 className="font-semibold text-blue-800 mb-3">Form Fields:</h4>
        <div className="space-y-3">
          {pageFormFields.map(field => (
            <div key={field.id} className="flex items-center">
              <label className="text-sm font-medium text-blue-700 w-32 truncate">
                {field.name || field.id}:
              </label>
              <input
                type="text"
                className="flex-1 px-3 py-1 border border-blue-300 rounded text-sm"
                placeholder={`Enter ${field.type} value`}
                onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                defaultValue={field.value || ''}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTextContent = () => {
    const pageText = textContent;
    
    if (pageText.length === 0) return null;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
        <h4 className="font-semibold text-gray-800 mb-2">Text Content:</h4>
        <div
          className="text-sm text-gray-600 max-h-32 overflow-y-auto leading-relaxed cursor-text"
          onMouseUp={handleTextSelection}
        >
          {pageText.map((item, index) => (
            <span key={index}>{item.text} </span>
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

  const renderEditor = () => (
    <div className="flex flex-col h-screen">
      {signModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Draw your Signature</h3>
            <div className="border border-gray-300 rounded-md">
              <SignaturePad
                ref={signaturePadRef}
                canvasProps={{ className: "w-full h-48 bg-gray-50" }}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => signaturePadRef.current.clear()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Clear
              </button>
              <button
                onClick={handleSignSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
              >
                Save Signature
              </button>
              <button
                onClick={() => setSignModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {tools.map(tool => (
                <button
                  key={tool.name}
                  className={`p-2 rounded-lg transition-colors ${
                    activeTool === tool.name
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={tool.hint}
                  onClick={() => {
                    if (tool.name === 'image') {
                      fileInputImageRef.current?.click();
                    } else if (tool.name === 'signature') {
                      setSignModalOpen(true);
                    } else {
                      setActiveTool(tool.name);
                    }
                  }}
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
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <span className="text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                
                <button
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  className="p-1 rounded hover:bg-gray-100"
                  onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                
                <span className="text-sm">{Math.round(scale * 100)}%</span>
                
                <button
                  className="p-1 rounded hover:bg-gray-100"
                  onClick={() => setScale(s => Math.min(3, s + 0.2))}
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 flex items-center"
                  onClick={applyEdits}
                  disabled={isProcessing}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Apply Edits'}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-200 p-4 overflow-auto">
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className="bg-white shadow-2xl rounded-lg overflow-hidden relative"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
            >
              {fileData?.fileUrl && (
                <iframe
                  src={fileData.fileUrl}
                  className="w-full h-full min-h-[800px] border-0"
                  title="PDF Viewer"
                />
              )}
            </div>
          </div>
        </div>

        {/* Editing Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Editing Tools</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">
                Current Edits: {edits.filter(e => e.page === currentPage).length}
              </h4>
              {edits.filter(e => e.page === currentPage).length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {edits.filter(e => e.page === currentPage).map(edit => (
                    <div key={edit.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="flex items-center truncate">
                        <span className={`w-2 h-2 rounded mr-2 ${
                          edit.type === 'modify-text' ? 'bg-purple-500' :
                          edit.type === 'add-text' ? 'bg-blue-500' :
                          edit.type === 'image' ? 'bg-green-500' :
                          edit.type === 'signature' ? 'bg-indigo-500' :
                          edit.type === 'pen' ? 'bg-red-500' :
                          edit.type === 'highlight' ? 'bg-yellow-500' :
                          edit.type === 'square' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></span>
                        {edit.type === 'modify-text' && `Modify: "${edit.originalText}"`}
                        {edit.type === 'add-text' && `Add: "${edit.content}"`}
                        {edit.type === 'image' && `Insert Image`}
                        {edit.type === 'signature' && `Add Signature`}
                        {edit.type === 'pen' && `Drawing`}
                        {edit.type === 'highlight' && `Highlight`}
                        {edit.type === 'square' && `Square`}
                      </span>
                      <button
                        onClick={() => setEdits(prev => prev.filter(e => e.id !== edit.id))}
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
            {renderTextContent()}
            {renderFormFields()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUploadScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-8 max-w-md w-full text-center">
        <File className="w-16 h-16 mx-auto text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Advanced PDF Editor</h2>
        <p className="text-gray-600 mb-6">Modify text, add content, insert images, and fill forms</p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 mb-4">
          <UploadCloud className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            disabled={isProcessing}
          >
            {isProcessing ? 'Uploading...' : 'Choose File to Edit'}
          </button>
        </div>
        
        <div className="text-left text-sm text-gray-500">
          <h4 className="font-semibold mb-2">Advanced Features:</h4>
          <ul className="space-y-1">
            <li>• Convert Word/Excel/PPT to PDF (via LibreOffice)</li>
            <li>• Modify existing text content</li>
            <li>• Add new text, images, and signatures</li>
            <li>• Highlight, draw, and add shapes</li>
            <li>• Fill out PDF forms</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderProcessingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {status === 'processing' ? 'Processing PDF...' : 'Applying Edits...'}
        </h3>
        <p className="text-gray-600">Please wait while we process your file</p>
      </div>
      <div className="mt-4 text-gray-500">
        <p>This may take a moment as we extract content.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            Advanced PDF Editor
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Modify text, insert images, fill forms - Real PDF content editing
          </p>
        </div>
      </header>

      <main>
        {status === 'upload' && renderUploadScreen()}
        {status === 'processing' && renderProcessingScreen()}
        {status === 'editor' && renderEditor()}
      </main>
    </div>
  );
};

export default PDFEditor;