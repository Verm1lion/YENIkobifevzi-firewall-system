// src/pages/BackupRestorePage.jsx
import React, { useState } from "react";
import axios from "axios";

function BackupRestorePage() {
  const [importFile, setImportFile] = useState(null);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/backup/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Gelen data JSON => dosya olarak indirelim
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "firewall_backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export hatası: " + err.message);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Lütfen dosya seçiniz");
      return;
    }
    try {
      const fileText = await importFile.text();
      const jsonData = JSON.parse(fileText);
      const token = localStorage.getItem("token");
      const res = await axios.post("http://127.0.0.1:8000/backup/import", jsonData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Yedek geri yüklendi. " + (res.data.message || ""));
    } catch (err) {
      alert("Import hatası: " + err.message);
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">Yedekleme & Geri Yükleme</h2>
      <div className="card mb-4">
        <div className="card-header">Yedekle</div>
        <div className="card-body">
          <button className="btn btn-primary" onClick={handleExport}>
            Yedek Al (Export)
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Geri Yükle</div>
        <div className="card-body">
          <input
            type="file"
            accept=".json"
            onChange={(e) => setImportFile(e.target.files[0])}
          />
          <button className="btn btn-success ms-2" onClick={handleImport}>
            Yükle
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackupRestorePage;
