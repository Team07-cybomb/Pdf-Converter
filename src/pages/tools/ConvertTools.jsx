import React from "react";
import { motion } from "framer-motion";
import { FileType, Image, FileText } from "lucide-react";

const tools = [
  { id: "convert", name: "Convert PDF", description: "PDF ↔ Word, Excel, PPT, Images", icon: FileType, color: "from-orange-500 to-red-500" },
  { id: "pdf-to-image", name: "PDF to Image", description: "Convert PDF pages to JPG/PNG", icon: Image, color: "from-pink-500 to-rose-500" },
  { id: "image-to-pdf", name: "Image to PDF", description: "Create PDF from images", icon: FileText, color: "from-indigo-500 to-purple-500" },
];

const ConvertTools = ({ handleToolClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tools.map((tool, i) => {
        const Icon = tool.icon;
        return (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05, y: -5 }}
            onClick={() => handleToolClick(tool)}
            className="glass-effect rounded-2xl p-6 cursor-pointer transition-all group"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}>
              <Icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">{tool.name}</h3>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ConvertTools;
