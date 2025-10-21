import React from "react";
import { motion } from "framer-motion";
import { Gauge, Trash2, Code2 } from "lucide-react";

const tools = [
  { id: "image-opt", name: "Image Optimizer", description: "Compress images without losing quality", icon: Gauge, color: "from-green-500 to-lime-500" },
  { id: "code-minify", name: "Code Minifier", description: "Minify JS, CSS, and HTML for faster loads", icon: Code2, color: "from-purple-500 to-pink-500" },
  { id: "cache-clean", name: "Cache Cleaner", description: "Clean and refresh system or browser cache", icon: Trash2, color: "from-blue-500 to-indigo-500" },
];

const OptimizeTools = ({ handleToolClick }) => {
  return (
<div className="w-full">
  <div className="grid gap-6 mt-6 grid-cols-3 w-full">
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
          className="glass-effect rounded-2xl p-6 cursor-pointer transition-all group flex flex-col h-full w-full"
        >
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-2">{tool.name}</h3>
          <p className="text-sm text-muted-foreground flex-grow">{tool.description}</p>
        </motion.div>
      );
    })}
  </div>
</div>


  );
};

export default OptimizeTools;
