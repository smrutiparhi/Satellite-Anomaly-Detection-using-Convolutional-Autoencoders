import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGoogleLogin } from "@react-oauth/google";
import { Crosshair, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const googleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";
  const useGoogleAuth = googleAuthEnabled && googleClientId.length > 0;

  function saveProfile(profile: { name: string; email: string; picture?: string }) {
    try {
      localStorage.setItem("user", JSON.stringify(profile));
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Browser storage is unavailable. Enable site storage to open the workspace.");
      setIsLoading(false);
    }
  }

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("Google could not verify this profile. Please sign in again.");
        const profile = await response.json();
        if (typeof profile.name !== "string" || typeof profile.email !== "string") {
          throw new Error("Google returned an incomplete profile. Please sign in again.");
        }
        saveProfile(profile);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to retrieve your Google profile.");
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in failed. Check the OAuth configuration and try again.");
      setIsLoading(false);
    },
    onNonOAuthError: (error) => {
      setError(error.type === "popup_failed_to_open"
        ? "The sign-in popup was blocked. Allow popups for this site and try again."
        : "The sign-in popup was closed. Try again when ready.");
      setIsLoading(false);
    },
  });

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setError(null);
    if (!useGoogleAuth) {
      saveProfile({ name: "Local Developer", email: "local@example.test" });
      return;
    }
    try { login(); }
    catch {
      setError("Google sign-in is not ready. Check your connection and OAuth client configuration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] flex relative overflow-hidden text-zinc-50 font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-zinc-800/30 rounded-full blur-[150px] mix-blend-screen opacity-50" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_100%)] pointer-events-none" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full flex flex-col justify-center items-center px-6">
        {/* Back Link */}
        <Link
          to="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 group-hover:bg-zinc-800 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Return to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* Brand Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 p-4 rounded-2xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-6">
              <Crosshair className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">
              Welcome Back
            </h1>
            <p className="text-zinc-400 text-center font-medium max-w-[280px]">
              Open the satellite reconstruction and novelty analysis workspace.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Google SSO Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full relative group flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:bg-zinc-200 text-zinc-950 px-4 py-3.5 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  <span className="text-zinc-600">Authenticating...</span>
                </>
              ) : (
                <>
                  {/* Google G Logo SVG */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  {useGoogleAuth ? "Continue with Google" : "Continue locally"}
                </>
              )}
            </button>

            <div className="relative flex items-center py-6 mt-2">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                {useGoogleAuth
                  ? "Google Single Sign-On"
                  : "Local workspace access"}
              </span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/80">
              <p className="text-xs text-zinc-500 leading-relaxed text-center font-medium">
                {useGoogleAuth
                  ? "Google authentication is enabled for this deployment. Sign in to create your browser workspace profile."
                  : "Google sign-in is not configured. Continue with a local browser profile; this is development access, not a verified Google account."}
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-500 mt-8 leading-5">
            Uploaded images are processed by the model service in memory.
            Scan summaries are saved in this browser.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
