// File: src/pages/FirewallWizardPage.jsx
import React, { useState } from "react";
import axios from "axios";

function FirewallWizardPage() {
  const [scenario, setScenario] = useState("rdp");
  const [result, setResult] = useState("");

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = `http://127.0.0.1:8000/firewall/wizard?scenario=${scenario}`;
      const res = await axios.post(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data.message || "Kural oluşturuldu.");
    } catch (err) {
      setResult("Hata: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">Kural Sihirbazı</h2>

      <div className="card">
        <div className="card-header">Hazır Senaryo Seçin</div>
        <div className="card-body">
          <div className="mb-3">
            <label>Senaryo</label>
            <select
              className="form-select"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              <option value="rdp">RDP (3389/tcp allow)</option>
              <option value="ssh">SSH (22/tcp allow)</option>
              <option value="webserver">Webserver (80/tcp allow)</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            Kuralı Oluştur
          </button>
        </div>
      </div>

      {result && <div className="alert alert-info mt-3">{result}</div>}
    </div>
  );
}

export default FirewallWizardPage;
