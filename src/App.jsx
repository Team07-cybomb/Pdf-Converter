import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/toaster";

// 🌐 Site Components
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/components/HomePage";
import LoginPage from "@/components/LoginPage";
import ToolsPage from "@/components/ToolsPage";
import BillingPage from "@/components/BillingPage";
import FilesPage from "@/components/FilesPage";
import EditPdfPage from "@/components/EditPdfPage";
import FaqPage from "@/components/FaqPage";
import AboutPage from "@/components/AboutPage";
import ContactPage from "@/components/ContactPage";
import BlogPage from "@/components/BlogPage";
import PressPage from "@/components/PressPage";
import SecurityPage from "@/components/SecurityPage";
import PrivacyPolicyPage from "@/components/PrivacyPolicyPage";
import TermsPage from "@/components/TermsPage";
import CookiesPage from "@/components/CookiesPage";

// 👤 User Dashboard (from components folder)
import UserDashboard from "@/components/Dashboard";

// 🛠️ Admin Pages (from pages/admin folder)
import AdminLoginPage from "@/components/AdminLoginPage";
import AdminDashboard from "@/pages/admin/Dashboard";
import Users from "@/pages/admin/Users";
import Settings from "@/pages/admin/Settings";

// 🔐 Auth & Route Guards
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

// ✨ Animations
import { AnimatePresence } from "framer-motion";

// ❌ 404 Page
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
    <p className="text-xl text-gray-700 mb-4">Oops! Page not found.</p>
    <a href="/" className="text-purple-600 hover:underline">Go back home</a>
  </div>
);

function AppContent() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>PDF Pro - The Future of Document Management</title>
        <meta
          name="description"
          content="AI-powered PDF editing, conversion, compression, OCR, and e-signature."
        />
      </Helmet>

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ================= ADMIN ROUTES ================= */}
          <Route
            path="/admin"
            element={
              JSON.parse(localStorage.getItem("pdfpro_admin"))
                ? <Navigate to="/admin/dashboard" replace />
                : <Navigate to="/admin/login" replace />
            }
          />

          <Route
            path="/admin/login"
            element={
              JSON.parse(localStorage.getItem("pdfpro_admin"))
                ? <Navigate to="/admin/dashboard" replace />
                : <AdminLoginPage />
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute>
                <Users />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <AdminProtectedRoute>
                <Settings />
              </AdminProtectedRoute>
            }
          />

          {/* ================= PUBLIC & USER ROUTES ================= */}
          <Route
            path="/*"
            element={
              <>
                <Header />
                <main className="flex-1 pt-20 pb-10 px-6">
                  <Routes location={location} key={location.pathname}>
                    {/* Public Pages */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/tools" element={<ToolsPage />} />
                    <Route path="/pricing" element={<BillingPage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/press" element={<PressPage />} />
                    <Route path="/security" element={<SecurityPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/cookies" element={<CookiesPage />} />

                    {/* Protected User Pages */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <UserDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tools/edit"
                      element={
                        <ProtectedRoute>
                          <EditPdfPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/files"
                      element={
                        <ProtectedRoute>
                          <FilesPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Not Found */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>
      </AnimatePresence>

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
