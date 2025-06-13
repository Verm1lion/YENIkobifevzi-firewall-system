// File: src/Layout.jsx

import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

function Layout({ children }) {
  // localStorage’de token var mı?
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const [showNetworkSub, setShowNetworkSub] = useState(false);
  const toggleNetworkSubMenu = () => {
    setShowNetworkSub(!showNetworkSub);
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      {/* Üst Navbar */}
      <nav className="navbar navbar-dark bg-dark" style={{ height: '80px' }}>
        <div className="container-fluid d-flex align-items-center justify-content-between h-100">
          <div className="d-flex flex-column">
            <span className="navbar-brand fs-3 mb-0">NetGate</span>
            <span className="text-white fs-6" style={{ marginTop: '-3px' }}>
              Hoş Geldiniz, Sistem Yöneticisi
            </span>
          </div>
        </div>
      </nav>

      {/* İçerik + Yan Menü */}
      <div className="flex-grow-1">
        <div className="row g-0 h-100">
          {/* Sol Menü */}
          <div
            className="col-auto bg-light"
            style={{ width: '220px', minHeight: 'calc(100vh - 80px)' }}
          >
            <div className="p-3">
              <h6 className="mb-3 text-uppercase text-secondary">Menü</h6>
              <ul className="nav flex-column">
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/dashboard">
                    Ana Sayfa
                  </Link>
                </li>
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/logs">
                    Log Yönetimi
                  </Link>
                </li>
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/updates">
                    Güncellemeler
                  </Link>
                </li>
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/rules">
                    Güvenlik Kuralları
                  </Link>
                </li>

                {/* Kural Grupları */}
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/groups">
                    Kural Grupları
                  </Link>
                </li>

                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/reports">
                    Raporlar
                  </Link>
                </li>
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/settings">
                    Sistem Ayarları
                  </Link>
                </li>

                {/* DNS Yönetimi */}
                <li className="nav-item mb-1">
                  <Link className="nav-link" to="/dns-management">
                    DNS Yönetimi
                  </Link>
                </li>

                {/* Network alt menü */}
                <li className="nav-item mb-1">
                  <div
                    style={{ cursor: 'pointer', color: '#000', fontWeight: 'bold' }}
                    onClick={toggleNetworkSubMenu}
                  >
                    Network {showNetworkSub ? '▼' : '▶'}
                  </div>
                  {showNetworkSub && (
                    <ul className="nav flex-column ms-3 mt-1">
                      <li className="nav-item mb-1">
                        <Link className="nav-link" to="/network">
                          Interface Ayarları
                        </Link>
                      </li>
                      <li className="nav-item mb-1">
                        <Link className="nav-link" to="/nat">
                          NAT Ayarları
                        </Link>
                      </li>
                      <li className="nav-item mb-1">
                        <Link className="nav-link" to="/routes">
                          Rota Yönetimi
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              </ul>
            </div>
          </div>

          {/* Sağdaki esas içerik */}
          <div className="col p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
