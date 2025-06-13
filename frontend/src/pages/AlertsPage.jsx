// File: src/pages/AlertsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/logs/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(res.data);
    } catch (err) {
      alert("Alarm kayıtları çekilemedi: " + err.message);
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">Alarm Kayıtları</h2>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Otomatik Analiz Sonucu Alarmlar</span>
          <button className="btn btn-sm btn-secondary" onClick={fetchAlerts}>
            Yenile
          </button>
        </div>
        <div className="card-body p-0">
          {alerts.length === 0 ? (
            <p className="p-3">Henüz alarm kaydı yok.</p>
          ) : (
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Seviye</th>
                  <th>Mesaj</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a._id}>
                    <td>{a.timestamp}</td>
                    <td>{a.level}</td>
                    <td>{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertsPage;
