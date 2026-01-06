import React from "react";
import { Outlet, Link } from "react-router-dom";

const layoutStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#1F2937",
  color: "#fff",
  padding: "12px 24px",
  display: "flex",
  alignItems: "center",
  gap: "24px",
};

const logoStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#fff",
  textDecoration: "none",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: "16px",
};

const navLinkStyle: React.CSSProperties = {
  color: "#D1D5DB",
  textDecoration: "none",
  fontSize: "14px",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

export function Layout() {
  return (
    <div style={layoutStyle}>
      <header style={headerStyle}>
        <Link to="/" style={logoStyle}>
          Omega Flow
        </Link>
        <nav style={navStyle}>
          <Link to="/" style={navLinkStyle}>
            Workflows
          </Link>
        </nav>
      </header>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}
