import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "@/features/admin/AdminApp";
import "./admin.css";

/* The admin panel (/admin): client-only, never prerendered or indexed. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
