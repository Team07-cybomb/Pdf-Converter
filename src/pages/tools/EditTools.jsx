import React from "react";
import { motion } from "framer-motion";
import { Edit3, Scissors, Type } from "lucide-react";

const tools = [
  { id: "text-editor", name: "Text Editor", description: "Edit and format text files easily", icon: Type, color: "from-blue-500 to-cyan-500" },
  { id: "image-crop", name: "Image Crop", description: "Crop and resize your images instantly", icon: Scissors, color: "from-emerald-500 to-green-500" },
  { id: "file-rename", name: "File Rename", description: "Batch rename your files smartly", icon: Edit3, color: "from-purple-500 to-indigo-500" },
];

const EditTools = ({ handleToolClick }) => {
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

export default EditTools;
