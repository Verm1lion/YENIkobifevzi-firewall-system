// src/pages/LogsPage.jsx
import React, { useState } from 'react';

function LogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [level, setLevel] = useState("");
  const [date, setDate] = useState("");

  const logs = [
    { id: 1, time: "2025-02-11 09:15", ip: "192.168.1.15", level: "INFO", message: "Bağlantı Sağlandı" },
    { id: 2, time: "2025-02-11 09:17", ip: "10.0.0.25", level: "ERROR", message: "Erişim Reddedildi" }
  ];

  const handleFilter = () => {
    console.log("Filtre Uygula", { searchTerm, level, date });
  };
  const exportCSV = () => {
    console.log("CSV çıktı...");
  };
  const exportPDF = () => {
    console.log("PDF çıktı...");
  };

  return (
    <div>
      <h2 className="dashboard-title">Log Yönetimi</h2>

      <div className="card mb-4">
        <div className="card-header d-flex align-items-center">
          <input
            className="form-control me-2"
            style={{ maxWidth: '200px' }}
            placeholder="Anahtar kelime"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-select me-2"
            style={{ maxWidth: '120px' }}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Hepsi</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
          <input
            type="date"
            className="form-control me-2"
            style={{ maxWidth: '160px' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn btn-primary me-2" onClick={handleFilter}>Filtre Uygula</button>
          <button className="btn btn-outline-secondary me-2" onClick={exportCSV}>CSV Çıkışı</button>
          <button className="btn btn-outline-secondary" onClick={exportPDF}>PDF Çıkışı</button>
        </div>
        <div className="card-body p-0">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Tarih/Saat</th>
                <th>Kaynak IP</th>
                <th>Seviye</th>
                <th>Mesaj</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{log.time}</td>
                  <td>{log.ip}</td>
                  <td>{log.level}</td>
                  <td>{log.message}</td>
                  <td><button className="btn btn-sm btn-info">İncele</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-flex justify-content-center mt-3">
        <button className="btn btn-secondary me-2">Önceki</button>
        <div className="pt-2">Sayfa 1/5</div>
        <button className="btn btn-secondary ms-2">Sonraki</button>
      </div>
    </div>
  );
}

export default LogsPage;
