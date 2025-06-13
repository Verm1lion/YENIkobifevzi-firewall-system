// File: src/pages/NatSettingsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

function NatSettingsPage() {
  const [interfaces, setInterfaces] = useState([]);
  const [wanInterface, setWanInterface] = useState("");
  const [lanInterface, setLanInterface] = useState("");
  const [natEnabled, setNatEnabled] = useState(false);

  useEffect(() => {
    fetchInterfaces();
    fetchNatStatus();
  }, []);

  // 1) /network/interfaces -> Arayüz listesini çek
  const fetchInterfaces = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/network/interfaces", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterfaces(res.data);
    } catch (err) {
      console.error("Arayüzleri çekerken hata:", err);
      alert("Arayüz listesini alırken hata oluştu: " + err.message);
    }
  };

  // 2) /nat -> Mevcut NAT durumunu çek
  const fetchNatStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/nat", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setNatEnabled(res.data.enabled);
        setWanInterface(res.data.wan || "");
        setLanInterface(res.data.lan || "");
      }
    } catch (err) {
      console.log("NAT durumu alınamadı:", err.message);
    }
  };

  // 3) Kaydet (PATCH /nat)
  const handleSave = async (e) => {
    e.preventDefault();

    // NAT etkinleştiriliyorsa WAN ve LAN farklı olmak zorunda
    if (natEnabled) {
      if (!wanInterface || !lanInterface) {
        alert("NAT açmak için WAN ve LAN arayüzlerini seçmelisiniz!");
        return;
      }
      if (wanInterface === lanInterface) {
        alert("WAN ve LAN aynı arayüz olamaz!");
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const body = {
        enabled: natEnabled,
        wan: wanInterface,
        lan: lanInterface
      };
      const res = await axios.patch("http://127.0.0.1:8000/nat", body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("NAT ayarı güncellendi. " + (res.data.message || ""));
    } catch (err) {
      console.error("NAT kaydetme hatası:", err);
      const msg = err.response?.data?.detail || err.message;
      alert("NAT ayarı kaydedilemedi: " + msg);
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">NAT Ayarları (ICS)</h2>
      <div className="card">
        <div className="card-header">LAN - WAN NAT Yönetimi</div>
        <div className="card-body">
          <form onSubmit={handleSave}>
            {/* WAN */}
            <div className="mb-3">
              <label className="form-label">WAN Interface (İnternet Erişimi Olan)</label>
              <select
                className="form-select"
                value={wanInterface}
                onChange={(e) => setWanInterface(e.target.value)}
              >
                <option value="">Seçiniz</option>
                {interfaces.map((inf) => (
                  <option key={inf.interface_name} value={inf.interface_name}>
                    {inf.interface_name}
                  </option>
                ))}
              </select>
            </div>

            {/* LAN */}
            <div className="mb-3">
              <label className="form-label">LAN Interface (İç Ağa Paylaşılacak)</label>
              <select
                className="form-select"
                value={lanInterface}
                onChange={(e) => setLanInterface(e.target.value)}
              >
                <option value="">Seçiniz</option>
                {interfaces.map((inf) => (
                  <option key={inf.interface_name} value={inf.interface_name}>
                    {inf.interface_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Etkin/Pasif Checkbox */}
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="chkNatEnabled"
                checked={natEnabled}
                onChange={(e) => setNatEnabled(e.target.checked)}
              />
              <label htmlFor="chkNatEnabled" className="form-check-label">
                NAT'ı Etkinleştir (ICS)
              </label>
            </div>

            <button type="submit" className="btn btn-primary">Kaydet</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NatSettingsPage;
