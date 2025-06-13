// src/pages/ReportsPage.jsx
import React from 'react';

function ReportsPage() {
  return (
    <div>
      <h2 className="dashboard-title">Raporlar</h2>

      <div className="card mb-4">
        <div className="card-header">Sistem Raporları</div>
        <div className="card-body">
          <p>
            Bu sayfada, firewall ve ağ etkinliğine dair detaylı raporlar listelenebilir:
          </p>
          <ul>
            <li>Aylık Trafik Raporu</li>
            <li>Engellenen IP’ler Raporu</li>
            <li>Güvenlik İhlali Denemeleri</li>
          </ul>
          <p className="text-muted">
            Gelecekte bu raporlar için CSV / PDF dışa aktarım, grafik gösterme gibi özellikler eklenebilir.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Özet Raporlar</div>
        <div className="card-body d-flex align-items-center justify-content-between">
          <p className="mb-0">
            Firewall etkinliği, kural kullanımı, saldırı tespiti gibi özet bilgiler burada olabilir.
          </p>
          <div>
            <button className="btn btn-success me-2">PDF Çıkışı</button>
            <button className="btn btn-info">CSV Çıkışı</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
