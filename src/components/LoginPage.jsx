import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ForgotPasswordForm from "./ForgotPasswordForm"; // Import the new component
const API_URL1 = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { loginBackend } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const API_URL = `${API_URL1}/api/auth`;
      const url = isLogin ? `${API_URL}/login` : `${API_URL}/register`;

      if (
        !isLogin &&
        (!formData.name || !formData.email || !formData.password)
      ) {
        toast({
          title: "Missing information",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        loginBackend(result.admin || result.user, result.token || "");
        toast({
          title: isLogin ? "Welcome back! 🎉" : "Account created! 🎉",
          description:
            result.message ||
            (isLogin ? "Login successful" : "Registration successful"),
        });
        navigate("/");
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Server error:", error);
      toast({
        title: "Server Error",
        description: "Unable to connect to backend",
        variant: "destructive",
      });
    }
  };

  const handleBackToLogin = () => {
    setForgotPassword(false);
    setForgotPasswordStep(1);
    setFormData({
      email: "",
      password: "",
      name: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const renderLoginRegisterForm = () => {
    return (
      <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pl-10"
              />
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold"
          >
            {isLogin ? "Login" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Login"}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      <Helmet>
        <title>
          {forgotPassword ? "Reset Password" : isLogin ? "Login" : "Sign Up"} -
         pdfworks
        </title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-8 max-w-md w-full shadow-lg bg-white/70 backdrop-blur-lg border border-white/30"
      >
        <Link to="/" className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
            <FileText className="h-10 w-10 text-white" />
          </div>
        </Link>

        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          {forgotPassword
            ? "Reset Password"
            : isLogin
            ? "Welcome Back!"
            : "Create Account"}
        </h1>

        {forgotPassword ? (
          <ForgotPasswordForm
            formData={formData}
            setFormData={setFormData}
            forgotPasswordStep={forgotPasswordStep}
            setForgotPasswordStep={setForgotPasswordStep}
            handleBackToLogin={handleBackToLogin}
          />
        ) : (
          renderLoginRegisterForm()
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
