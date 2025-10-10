import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  FileText,
  Download,
  Trash2,
  Calendar,
  File,
  Eye,
} from "lucide-react";

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchFiles = async () => {
    try {
      setError("");
      const res = await fetch("http://localhost:5000/api/files", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch files: ${res.status}`);
      }

      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error("Error fetching files:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/files/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete file");
      }

      setFiles((prev) => prev.filter((file) => file._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete file");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter files based on search term
  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreview = (file) => {
    window.open(`http://localhost:5000/${file.path}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-600">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold gradient-text">My Files 📁</h1>
        <p className="text-muted-foreground">
          Manage all your processed documents
        </p>
      </motion.div>

      {/* Search Bar */}
      <div className="glass-effect rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-transparent border-none focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-effect rounded-2xl p-4 border border-red-200 text-red-700"
        >
          <p>{error}</p>
          <button
            onClick={fetchFiles}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* File List */}
      {filteredFiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-effect rounded-2xl p-12 text-center"
        >
          <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            {searchTerm ? "No files found" : "No files yet"}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Try adjusting your search terms to find what you're looking for."
              : "Upload and process your first PDF to get started!"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFiles.map((file, index) => (
            <motion.div
              key={file._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-effect rounded-xl p-4 hover-lift"
            >
              <div className="flex items-center gap-4">
                {/* File Icon */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-white" />
                </div>

                {/* File Info */}
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold truncate text-foreground">
                    {file.filename}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size || 0)}</span>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(file.uploadedAt)}</span>
                    <span>•</span>
                    <span className="capitalize">
                      {file.toolUsed || "converted"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <a
                    href={`http://localhost:5000/${file.path}`}
                    download={file.filename}
                    className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(file._id)}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* File Count */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground text-center"
        >
          Showing {filteredFiles.length} of {files.length} files
          {searchTerm && ` for "${searchTerm}"`}
        </motion.div>
      )}
    </div>
  );
};

export default FilesPage;
