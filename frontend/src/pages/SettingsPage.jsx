// src/pages/SettingsPage.jsx
import React, { useState } from 'react';

function SettingsPage() {
  const [timezone, setTimezone] = useState("Europe/Istanbul");
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [backupSchedule, setBackupSchedule] = useState("Haftalık");

  const handleSave = () => {
    alert(
      `Kaydedildi!\nZaman Dilimi: ${timezone}\nOtomatik Güncelleme: ${autoUpdate ? "Açık" : "Kapalı"}\nYedekleme Planı: ${backupSchedule}`
    );
  };

  return (
    <div>
      <h2 className="dashboard-title">Sistem Ayarları</h2>

      <div className="card mb-4">
        <div className="card-header">Genel Ayarlar</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Zaman Dilimi</label>
            <select
              className="form-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Europe/Istanbul">Europe/Istanbul</option>
              <option value="UTC">UTC</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>

          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="autoUpdate"
              checked={autoUpdate}
              onChange={() => setAutoUpdate(!autoUpdate)}
            />
            <label className="form-check-label" htmlFor="autoUpdate">
              Otomatik Güncellemeleri Etkinleştir
            </label>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">Yedekleme Planı</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Yedekleme Sıklığı</label>
            <select
              className="form-select"
              value={backupSchedule}
              onChange={(e) => setBackupSchedule(e.target.value)}
            >
              <option value="Günlük">Günlük</option>
              <option value="Haftalık">Haftalık</option>
              <option value="Aylık">Aylık</option>
            </select>
          </div>

          <button className="btn btn-success" onClick={handleSave}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
