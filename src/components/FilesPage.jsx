import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { File, Download, Trash2, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const FilesPage = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = () => {
    const storedFiles = JSON.parse(localStorage.getItem(`pdfpro_files_${user?.id}`) || '[]');
    setFiles(storedFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
  };

  const handleDelete = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    localStorage.setItem(`pdfpro_files_${user.id}`, JSON.stringify(updatedFiles));
    setFiles(updatedFiles);
    toast({
      title: "File deleted",
      description: "The file has been removed from your storage",
    });
  };

  const handleDownload = (fileName) => {
    toast({
      title: "Download Started!",
      description: `Preparing to download ${fileName}`,
    });
  };

  const handlePreview = (fileName) => {
    toast({
      title: "Opening Preview",
      description: `Loading preview for ${fileName}`,
    });
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold gradient-text">My Files 📁</h1>
        <p className="text-muted-foreground">Manage all your processed documents</p>
      </motion.div>

      <div className="glass-effect rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-transparent"
          />
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-effect rounded-2xl p-12 text-center"
        >
          <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No files yet</h3>
          <p className="text-muted-foreground">Upload and process your first PDF to get started!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFiles.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-effect rounded-xl p-4 hover-lift"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center">
                  <File className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold truncate">{file.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(file.uploadedAt).toLocaleDateString()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handlePreview(file.name)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(file.name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(file.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilesPage;