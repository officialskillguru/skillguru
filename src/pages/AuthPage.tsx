
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const auth = useAuth();
  
  if (auth.session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen items-center justify-center">
        <div>Please log in (Auth placeholder).</div>
    </div>
  );
}
