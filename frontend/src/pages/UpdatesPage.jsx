// src/pages/UpdatesPage.jsx
import React from 'react';

function UpdatesPage() {
  return (
    <div>
      <h2 className="dashboard-title">Güncellemeler</h2>

      <div className="card">
        <div className="card-header">Sistem & Firewall Güncellemeleri</div>
        <div className="card-body">
          <p>Firewall ve sistem güncellemeleri burada listelenecektir. Örneğin:</p>
          <ul>
            <li>Son Yama Tarihi: 2025-04-10</li>
            <li>Sürüm: NetGate FW 2.1.0</li>
            <li>Otomatik Güncelleme Durumu: Açık</li>
          </ul>
          <p className="text-muted">
            Güncelleme detayları, değişiklik günlüğü vb. eklenebilir.
          </p>
        </div>
      </div>
    </div>
  );
}

export default UpdatesPage;
