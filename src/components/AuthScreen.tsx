import React, { useState } from "react";
import { 
  Smartphone, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone as PhoneIcon, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  X,
  Check
} from "lucide-react";
import { loginWithEmail, registerWithEmail, sendPasswordReset } from "../lib/firebase";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal and toast states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccessMessage(null);

    try {
      await sendPasswordReset(forgotEmail);
      
      const successMsg = `Password reset link sent to ${forgotEmail}! Please check your inbox.`;
      setForgotSuccessMessage(successMsg);
      setToastMessage(successMsg);
      setShowToast(true);
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 5000);

      // Keep modal open briefly to see success, then close automatically
      setTimeout(() => {
        setShowForgotModal(false);
      }, 2500);
    } catch (err: any) {
      setForgotError(err.message || "An error occurred while sending the reset link. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!isLogin && (!name || !phone)) {
      setError("Please provide your name and contact phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const user = await loginWithEmail(email, password);
        onAuthSuccess(user);
      } else {
        const user = await registerWithEmail(email, password, name, phone);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: "buyer" | "seller") => {
    setLoading(true);
    setError(null);
    try {
      const email = role === "seller" ? "arun@reclassic.com" : "buyer@demo.com";
      const password = "password123";
      
      // Auto-register demo account in LocalStorage if it doesn't exist
      if (role === "buyer") {
        try {
          await registerWithEmail(email, password, "Rajesh Kumar", "+91 99001 12233");
        } catch (e) {
          // already exists, proceed to login
        }
      } else {
        try {
          await registerWithEmail(email, password, "Arun Kumar", "+91 98765 43210");
        } catch (e) {
          // already exists, proceed to login
        }
      }

      const user = await loginWithEmail(email, password);
      onAuthSuccess(user);
    } catch (err: any) {
      setError("Failed to login with demo account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 justify-between text-slate-100 overflow-y-auto px-6 py-8 relative" id="auth-screen-container">
      {/* Brand Section */}
      <div className="flex flex-col items-center text-center mt-4">
        <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 mb-4 animate-bounce">
          <Smartphone size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          Auto <span className="text-sky-400">Parts</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1 max-w-xs">
          The ultimate marketplace for buying and selling automobile spare parts locally.
        </p>
      </div>

      {/* Main Authentication Form */}
      <div className="bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl mt-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`text-sm font-semibold pb-1.5 border-b-2 transition-all ${
              isLogin 
                ? "border-sky-500 text-sky-400" 
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
            id="auth-toggle-login"
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`text-sm font-semibold pb-1.5 border-b-2 transition-all ${
              !isLogin 
                ? "border-sky-500 text-sky-400" 
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
            id="auth-toggle-signup"
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2 animate-fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block">Full Name</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    required={!isLogin}
                    id="input-name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block">Contact Phone Number</label>
                <div className="relative">
                  <PhoneIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 XXXXX"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    required={!isLogin}
                    id="input-phone"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 block">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                required
                id="input-email"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                required
                id="input-password"
              />
            </div>
            {isLogin && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email); // autofill with entered email
                    setForgotError(null);
                    setForgotSuccessMessage(null);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  id="forgot-password-trigger"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 mt-2 transition-all shadow-md shadow-sky-500/10 active:scale-[0.98] disabled:opacity-50"
            id="auth-submit-btn"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Create Account"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Access Demo Accounts */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold justify-center">
          <ShieldCheck size={12} />
          <span>DEVELOPER QUICK SIGN-IN</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleQuickLogin("seller")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium py-2 px-3 rounded-xl text-xs transition-colors active:scale-95"
            id="btn-demo-seller"
          >
            <UserCheck size={13} className="text-sky-400" />
            Demo Seller
          </button>
          <button
            onClick={() => handleQuickLogin("buyer")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium py-2 px-3 rounded-xl text-xs transition-colors active:scale-95"
            id="btn-demo-buyer"
          >
            <UserCheck size={13} className="text-indigo-400" />
            Demo Buyer
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-4 right-4 z-50 pointer-events-auto"
            id="forgot-password-toast"
          >
            <div className="bg-emerald-500/95 backdrop-blur-md text-white text-xs font-bold px-4 py-3.5 rounded-2xl shadow-xl border border-emerald-400/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Check size={16} className="shrink-0 text-emerald-100 bg-emerald-600/40 rounded-full p-0.5" />
                <span>{toastMessage}</span>
              </div>
              <button 
                onClick={() => setShowToast(false)} 
                className="text-white/80 hover:text-white p-0.5 shrink-0 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="forgot-password-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-xl">
                    <Lock size={16} />
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Reset Password</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">We will send a reset link to your email</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                  id="close-forgot-modal-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleForgotSubmit} className="p-5 space-y-4">
                {forgotError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                    <Check size={15} className="shrink-0 mt-0.5" />
                    <span>{forgotSuccessMessage}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block">Registered Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                      required
                      id="forgot-input-email"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-xs text-slate-300 font-bold transition-all cursor-pointer"
                    id="cancel-reset-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50"
                    id="send-reset-link-btn"
                  >
                    {forgotLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
