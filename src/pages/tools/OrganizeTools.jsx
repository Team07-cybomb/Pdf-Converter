import React from "react";
import { motion } from "framer-motion";
import { Merge, Split, RotateCw } from "lucide-react";

const tools = [
  {
    id: "merge",
    name: "Merge PDFs",
    description: "Combine multiple PDFs into one",
    icon: Merge,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Extract pages or split by range",
    icon: Split,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "rotate",
    name: "Rotate Pages",
    description: "Rotate and reorder PDF pages",
    icon: RotateCw,
    color: "from-yellow-500 to-orange-500",
  },
];

const OrganizeTools = ({ handleToolClick }) => {
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
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}
            >
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

export default OrganizeTools;
