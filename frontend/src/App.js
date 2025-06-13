// File: src/App.js

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LogsPage from "./pages/LogsPage";
import UpdatesPage from "./pages/UpdatesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import FirewallRulesPage from "./pages/FirewallRulesPage";
import NetworkInterfacesPage from "./pages/NetworkInterfacesPage";
import NatSettingsPage from "./pages/NatSettingsPage";
import StaticRoutesPage from "./pages/StaticRoutesPage";
import FirewallGroupsPage from "./pages/FirewallGroupsPage";

// YENİ: DNS Yönetimi sayfası (eski DomainBlockPage.jsx yerine)
import DNSManagementPage from "./pages/DNSManagementPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Kök path => /login'e yönlendir */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          }
        />

        {/* Logs */}
        <Route
          path="/logs"
          element={
            <Layout>
              <LogsPage />
            </Layout>
          }
        />

        {/* Updates */}
        <Route
          path="/updates"
          element={
            <Layout>
              <UpdatesPage />
            </Layout>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <Layout>
              <ReportsPage />
            </Layout>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <Layout>
              <SettingsPage />
            </Layout>
          }
        />

        {/* Firewall Kuralları */}
        <Route
          path="/rules"
          element={
            <Layout>
              <FirewallRulesPage />
            </Layout>
          }
        />

        {/* Kural Grupları */}
        <Route
          path="/groups"
          element={
            <Layout>
              <FirewallGroupsPage />
            </Layout>
          }
        />

        {/* Network */}
        <Route
          path="/network"
          element={
            <Layout>
              <NetworkInterfacesPage />
            </Layout>
          }
        />
        <Route
          path="/nat"
          element={
            <Layout>
              <NatSettingsPage />
            </Layout>
          }
        />
        <Route
          path="/routes"
          element={
            <Layout>
              <StaticRoutesPage />
            </Layout>
          }
        />

        {/* YENİ: DNS Yönetimi */}
        <Route
          path="/dns-management"
          element={
            <Layout>
              <DNSManagementPage />
            </Layout>
          }
        />

        {/* 404 benzeri */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
