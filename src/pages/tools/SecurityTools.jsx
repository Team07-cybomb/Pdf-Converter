import React from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, Key } from "lucide-react";

const tools = [
  { id: "encryption", name: "File Encryption", description: "Secure your files with AES encryption", icon: Lock, color: "from-red-500 to-rose-600" },
  { id: "auth", name: "2FA Authentication", description: "Add two-factor verification to accounts", icon: ShieldCheck, color: "from-orange-500 to-yellow-500" },
  { id: "access", name: "Access Control", description: "Manage user permissions easily", icon: Key, color: "from-sky-500 to-blue-600" },
];

const SecurityTools = ({ handleToolClick }) => {
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

export default SecurityTools;
