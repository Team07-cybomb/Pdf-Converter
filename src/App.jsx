import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Dashboard from '@/components/Dashboard';
import ToolsPage from '@/components/ToolsPage';
import FilesPage from '@/components/FilesPage';
import AdminPage from '@/components/AdminPage';
import BillingPage from '@/components/BillingPage';
import LoginPage from '@/components/LoginPage';
import HomePage from '@/components/HomePage';
import FaqPage from '@/components/FaqPage';
import AboutPage from '@/components/AboutPage';
import ContactPage from '@/components/ContactPage';
import BlogPage from '@/components/BlogPage';
import PressPage from '@/components/PressPage';
import SecurityPage from '@/components/SecurityPage';
import PrivacyPolicyPage from '@/components/PrivacyPolicyPage';
import TermsPage from '@/components/TermsPage';
import CookiesPage from '@/components/CookiesPage';
import EditPdfPage from '@/components/EditPdfPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  const mainContent = (
    <main className="flex-1 pt-20 pb-10 px-6">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <LoginPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/edit" element={user ? <EditPdfPage /> : <LoginPage />} />
          <Route path="/files" element={user ? <FilesPage /> : <LoginPage />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Dashboard />} />
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
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AnimatePresence>
    </main>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>PDF Pro - The Future of Document Management</title>
        <meta name="description" content="AI-powered PDF editing, conversion, compression, OCR, e-signature and more - all in one powerful platform." />
      </Helmet>
      
      <Header />
      {mainContent}
      <Footer />
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