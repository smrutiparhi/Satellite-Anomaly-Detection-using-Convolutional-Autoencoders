/// <reference types="vite/client" />
import { Suspense, lazy, type ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import { readUser } from "./utils/session";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "development-auth-disabled";

function ProtectedRoute({ children }: { children: ReactNode }) {
  return readUser() ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-[#020202] text-zinc-400 flex items-center justify-center">
                      Loading analysis workspace…
                    </div>
                  }
                >
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
