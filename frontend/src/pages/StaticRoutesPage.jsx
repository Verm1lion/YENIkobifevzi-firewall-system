// src/pages/StaticRoutesPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

function StaticRoutesPage() {
  const [routes, setRoutes] = useState([]);

  // Form inputlar
  const [destination, setDestination] = useState("");
  const [mask, setMask] = useState("");
  const [gateway, setGateway] = useState("");
  const [selectedInterface, setSelectedInterface] = useState("");
  const [metric, setMetric] = useState("1");
  const [enabled, setEnabled] = useState(true);

  // Arayüz dropdown için
  const [interfaces, setInterfaces] = useState([]);

  useEffect(() => {
    fetchRoutes();
    fetchInterfaces();
  }, []);

  // 1) Mevcut rotaları çek
  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/routes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoutes(res.data);
    } catch (err) {
      alert("Rota listesi alınamadı: " + (err.response?.data?.detail || err.message));
    }
  };

  // 2) Arayüz listesi
  const fetchInterfaces = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/network/interfaces", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterfaces(res.data.map((inf) => inf.interface_name));
    } catch (err) {
      alert("Arayüz listesi alınamadı: " + (err.response?.data?.detail || err.message));
    }
  };

  // 3) Yeni rota ekle
  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!destination || !mask || !gateway || !selectedInterface) {
      alert("Tüm alanları doldurmalısınız!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const body = {
        destination,
        mask,
        gateway,
        interface_name: selectedInterface,
        metric: Number(metric),
        enabled
      };
      const res = await axios.post("http://127.0.0.1:8000/routes", body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data.message || "Rota eklendi.");
      fetchRoutes(); // tabloyu güncelle
    } catch (err) {
      alert("Rota ekleme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  // 4) Rota sil
  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm("Bu rotayı silmek istediğinize emin misiniz?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://127.0.0.1:8000/routes/${routeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Rota silindi.");
      fetchRoutes();
    } catch (err) {
      alert("Rota silme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">Statik Rota Yönetimi</h2>

      <div className="card mb-4">
        <div className="card-header">Mevcut Rotalar</div>
        <div className="card-body p-0">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Destination</th>
                <th>Mask</th>
                <th>Gateway</th>
                <th>Interface</th>
                <th>Metric</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((rt) => (
                <tr key={rt._id}>
                  <td>{rt.destination}</td>
                  <td>{rt.mask}</td>
                  <td>{rt.gateway}</td>
                  <td>{rt.interface_name}</td>
                  <td>{rt.metric}</td>
                  <td>{rt.enabled ? "Aktif" : "Pasif"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteRoute(rt._id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Yeni Rota Ekle</div>
        <div className="card-body">
          <form onSubmit={handleAddRoute}>
            <div className="mb-3">
              <label>Destination (Ör: 192.168.50.0)</label>
              <input
                className="form-control"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label>Mask (Ör: 255.255.255.0)</label>
              <input
                className="form-control"
                value={mask}
                onChange={(e) => setMask(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label>Gateway</label>
              <input
                className="form-control"
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label>Interface</label>
              <select
                className="form-select"
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
              >
                <option value="">-- Seçiniz --</option>
                {interfaces.map((inf) => (
                  <option key={inf} value={inf}>
                    {inf}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label>Metric</label>
              <input
                type="number"
                className="form-control"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              />
            </div>
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                id="chkEnabled"
              />
              <label htmlFor="chkEnabled" className="form-check-label">
                Rota Aktif
              </label>
            </div>
            <button type="submit" className="btn btn-primary">
              Ekle
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StaticRoutesPage;
