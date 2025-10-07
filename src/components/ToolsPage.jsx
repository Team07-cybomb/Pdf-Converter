import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Merge, Split, Minimize2, FileType, Image, RotateCw, Droplet, Edit3, Lock, Eye, FileSignature, Layers, Crop, FileText, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileUploadModal from '@/components/FileUploadModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ToolsPage = () => {
  const [selectedTool, setSelectedTool] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const tools = [
    { id: 'merge', name: 'Merge PDFs', description: 'Combine multiple PDFs into one', icon: Merge, color: 'from-blue-500 to-cyan-500', category: 'organize' },
    { id: 'split', name: 'Split PDF', description: 'Extract pages or split by range', icon: Split, color: 'from-purple-500 to-pink-500', category: 'organize' },
    { id: 'compress', name: 'Compress PDF', description: 'Reduce file size with quality options', icon: Minimize2, color: 'from-green-500 to-emerald-500', category: 'optimize' },
    { id: 'convert', name: 'Convert PDF', description: 'PDF ↔ Word, Excel, PPT, Images', icon: FileType, color: 'from-orange-500 to-red-500', category: 'convert' },
    { id: 'pdf-to-image', name: 'PDF to Image', description: 'Convert PDF pages to JPG/PNG', icon: Image, color: 'from-pink-500 to-rose-500', category: 'convert' },
    { id: 'image-to-pdf', name: 'Image to PDF', description: 'Create PDF from images', icon: FileText, color: 'from-indigo-500 to-purple-500', category: 'convert' },
    { id: 'rotate', name: 'Rotate Pages', description: 'Rotate and reorder PDF pages', icon: RotateCw, color: 'from-yellow-500 to-orange-500', category: 'organize' },
    { id: 'watermark', name: 'Add Watermark', description: 'Add text or image watermarks', icon: Droplet, color: 'from-cyan-500 to-blue-500', category: 'edit' },
    { id: 'edit', name: 'Edit PDF', description: 'Add text, images, and shapes', icon: Edit3, color: 'from-violet-500 to-purple-500', category: 'edit' },
    { id: 'protect', name: 'Protect PDF', description: 'Add password and encryption', icon: Lock, color: 'from-red-500 to-pink-500', category: 'security' },
    { id: 'ocr', name: 'OCR Scanner', description: 'Extract text from scanned PDFs', icon: Eye, color: 'from-teal-500 to-green-500', category: 'advanced' },
    { id: 'sign', name: 'E-Sign PDF', description: 'Add digital signatures', icon: FileSignature, color: 'from-blue-600 to-indigo-600', category: 'advanced' },
    { id: 'flatten', name: 'Flatten PDF', description: 'Flatten layers and forms', icon: Layers, color: 'from-gray-500 to-slate-600', category: 'advanced' },
    { id: 'crop', name: 'Crop Pages', description: 'Crop PDF page margins', icon: Crop, color: 'from-lime-500 to-green-500', category: 'edit' },
  ];

  const categories = [
    { id: 'all', name: 'All Tools', icon: Zap },
    { id: 'organize', name: 'Organize', icon: Merge },
    { id: 'convert', name: 'Convert', icon: FileType },
    { id: 'edit', name: 'Edit', icon: Edit3 },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'optimize', name: 'Optimize', icon: Minimize2 },
    { id: 'advanced', name: 'Advanced', icon: Eye },
  ];

  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTools = activeCategory === 'all' 
    ? tools 
    : tools.filter(tool => tool.category === activeCategory);

  const handleToolClick = (tool) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (tool.id === 'edit') {
      navigate('/tools/edit');
    } else {
      setSelectedTool(tool);
      setShowUploadModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold gradient-text">PDF Tools 🛠️</h1>
        <p className="text-muted-foreground">Choose a tool to get started with your PDF</p>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 whitespace-nowrap ${
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => handleToolClick(tool)}
              className="glass-effect rounded-2xl p-6 cursor-pointer transition-all group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{tool.name}</h3>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </motion.div>
          );
        })}
      </div>

      {showUploadModal && (
        <FileUploadModal
          tool={selectedTool}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedTool(null);
          }}
        />
      )}
    </div>
  );
};

export default ToolsPage;