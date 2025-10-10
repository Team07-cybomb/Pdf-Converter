import React, { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Settings2, BarChart3 } from "lucide-react";

// Tools data
const tools = [
  { id: "automation", name: "Automation Runner", description: "Run scripts and workflows automatically", icon: Cpu, color: "from-teal-500 to-green-500" },
  { id: "api-connect", name: "API Integrator", description: "Easily connect third-party APIs", icon: Settings2, color: "from-indigo-500 to-sky-500" },
  { id: "analytics", name: "Analytics Dashboard", description: "Track performance and metrics", icon: BarChart3, color: "from-yellow-500 to-orange-500" },
];

const AdvancedTools = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");

  const containerStyle = { padding: "1.5rem", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", minHeight: "100vh" };
  const titleStyle = { fontSize: "2rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#1e293b", textShadow: "0 2px 4px rgba(0,0,0,0.1)" };
  const inputContainerStyle = { marginBottom: "1rem", padding: "1rem", backgroundColor: "rgba(255, 255, 255, 0.8)", borderRadius: "0.75rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" };
  const inputStyle = { width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.875rem", boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)" };
  const labelStyle = { display: "block", color: "#374151", marginBottom: "0.5rem", fontWeight: "500" };
  const cardStyle = { backdropFilter: "blur(10px)", backgroundColor: "rgba(255, 255, 255, 0.8)", borderRadius: "1rem", padding: "1.5rem", cursor: "pointer", transition: "all 0.3s ease", border: "1px solid rgba(255, 255, 255, 0.5)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" };
  const statusStyle = { marginTop: "2rem", padding: "1rem", backgroundColor: "rgba(255, 255, 255, 0.9)", borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" };

  const handleToolClick = async (tool) => {
    setLoading(true); setError(""); setResult(null);
    try {
      let res;
      if (tool.id === "automation") {
        res = await fetch("http://localhost:5000/api/advanced/automation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks: ["convert", "compress", "merge"] }),
        });
      } else if (tool.id === "api-connect") {
        if (!apiUrl.trim()) throw new Error("Please enter an API URL");
        let parsedBody = null;
        let parsedHeaders = null;
        if (body.trim()) parsedBody = JSON.parse(body);
        if (headers.trim()) parsedHeaders = JSON.parse(headers);

        res = await fetch("http://localhost:5000/api/advanced/api-connect", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: apiUrl, method, body: parsedBody, headers: parsedHeaders }),
        });
      } else if (tool.id === "analytics") {
        res = await fetch("http://localhost:5000/api/advanced/analytics");
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Something went wrong");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>⚙️ Advanced Tools</h2>

      {tools.find(t => t.id === "api-connect") && (
        <div style={{
          ...inputContainerStyle,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem"
        }}>

          {/* API URL */}
          <div>
            <label style={labelStyle}>API URL:</label>
            <input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)} style={inputStyle} placeholder="https://example.com/api" />
          </div>

          {/* HTTP Method */}
          <div>
            <label style={labelStyle}>HTTP Method:</label>
            <select style={inputStyle} value={method} onChange={e => setMethod(e.target.value)}>
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </div>

          {/* Headers */}
          <div>
            <label style={labelStyle}>Headers (JSON, optional):</label>
            <textarea style={{ ...inputStyle, height: "45px" }} value={headers} onChange={e => setHeaders(e.target.value)} placeholder='{"Authorization":"Bearer ..."}' />
          </div>

          {/* Body - Full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Body (JSON, optional):</label>
            <textarea style={{ ...inputStyle, height: "80px" }} value={body} onChange={e => setBody(e.target.value)} placeholder='{"key":"value"}' />
          </div>

        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <motion.div key={tool.id} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }} whileHover={{ scale: 1.03, y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }} whileTap={{ scale: 0.98 }} onClick={() => handleToolClick(tool)} style={cardStyle}>
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#1e293b" }}>{tool.name}</h3>
              <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: "1.5" }}>{tool.description}</p>
            </motion.div>
          );
        })}
      </div>

      <div style={statusStyle}>
        {loading && <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#2563eb", fontWeight: "500" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: "16px", height: "16px", border: "2px solid #2563eb", borderTop: "2px solid transparent", borderRadius: "50%" }} />
          Processing your request...
        </div>}
        {error && <div style={{ color: "#dc2626", fontWeight: "500", padding: "0.75rem", backgroundColor: "#fef2f2", borderRadius: "0.5rem", border: "1px solid #fecaca" }}>❌ {error}</div>}
        {result && <div>
          <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "#059669" }}>✅ Result:</h4>
          <pre style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", fontSize: "0.75rem", overflow: "auto", maxHeight: "16rem", border: "1px solid #e2e8f0" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>}
      </div>
    </div>
  );
};

export default AdvancedTools;
