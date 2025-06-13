// src/pages/NetworkInterfacesPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Basit IP/subnet Regex
const ipRegex = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
const maskRegex = /^((255|254|252|248|240|224|192|128|0)\.){3}(255|254|252|248|240|224|192|128|0)$/;

function NetworkInterfacesPage() {
  const [interfaces, setInterfaces] = useState([]);

  // Form state
  const [intfName, setIntfName] = useState("Ethernet");
  const [ipMode, setIpMode] = useState("static");
  const [ipAddress, setIpAddress] = useState("");
  const [subnetMask, setSubnetMask] = useState("");
  const [gateway, setGateway] = useState("");
  const [dnsPrimary, setDnsPrimary] = useState("");
  const [dnsSecondary, setDnsSecondary] = useState("");
  const [adminEnabled, setAdminEnabled] = useState(true);
  const [mtu, setMtu] = useState(1500);
  const [vlanId, setVlanId] = useState("");

  // Validation errors
  const [ipErr, setIpErr] = useState("");
  const [maskErr, setMaskErr] = useState("");
  const [mtuErr, setMtuErr] = useState("");
  const [vlanErr, setVlanErr] = useState("");

  // Edit mode flag
  const [isEditMode, setIsEditMode] = useState(false);

  // Form görünür/gizli toggle
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchInterfaces();
  }, []);

  const fetchInterfaces = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/network/interfaces", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterfaces(res.data);
    } catch (err) {
      console.error(err);
      alert("Arayüzleri çekerken hata: " + err.message);
    }
  };

  // Validation
  const handleIpChange = (e) => {
    const val = e.target.value;
    setIpAddress(val);
    if (val && !ipRegex.test(val)) setIpErr("Geçersiz IP formatı");
    else setIpErr("");
  };

  const handleMaskChange = (e) => {
    const val = e.target.value;
    setSubnetMask(val);
    if (val && !maskRegex.test(val)) setMaskErr("Geçersiz Subnet Mask");
    else setMaskErr("");
  };

  const handleMtuChange = (e) => {
    const val = e.target.value;
    setMtu(val);
    const num = parseInt(val, 10);
    if (num < 576 || num > 9000) setMtuErr("MTU 576-9000 arası olmalı.");
    else setMtuErr("");
  };

  const handleVlanChange = (e) => {
    const val = e.target.value;
    setVlanId(val);
    const num = parseInt(val, 10);
    if (num < 0 || num > 4095) setVlanErr("VLAN ID 0-4095 arası olmalı.");
    else setVlanErr("");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (ipMode === "static") {
      if (!ipAddress || ipErr) {
        alert("IP Address hatalı veya boş!");
        return;
      }
      if (!subnetMask || maskErr) {
        alert("Subnet Mask hatalı veya boş!");
        return;
      }
    }
    if (mtuErr || vlanErr) {
      alert("MTU veya VLAN ID hatalı!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const body = {
        interface_name: intfName,
        ip_mode: ipMode,
        ip_address: ipMode === "static" ? ipAddress : null,
        subnet_mask: ipMode === "static" ? subnetMask : null,
        gateway: ipMode === "static" ? gateway : null,
        dns_primary: ipMode === "static" ? (dnsPrimary || null) : null,
        dns_secondary: ipMode === "static" ? (dnsSecondary || null) : null,
        admin_enabled: adminEnabled,
        mtu: mtu ? Number(mtu) : null,
        vlan_id: vlanId ? Number(vlanId) : null
      };

      const tokenHeader = { headers: { Authorization: `Bearer ${token}` } };
      let res;
      if (!isEditMode) {
        // POST => yeni interface ekle
        res = await axios.post("http://127.0.0.1:8000/network/interfaces", body, tokenHeader);
        alert(res.data.message || "Arayüz oluşturuldu");
      } else {
        // PUT => varolanı güncelle
        const url = `http://127.0.0.1:8000/network/interfaces/${intfName}`;
        res = await axios.put(url, body, tokenHeader);
        alert(res.data.message || "Arayüz güncellendi");
      }

      clearForm();
      setShowForm(false);
      fetchInterfaces();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      alert("Hata oluştu: " + msg);
    }
  };

  const clearForm = () => {
    setIntfName("Ethernet");
    setIpMode("static");
    setIpAddress("");
    setSubnetMask("");
    setGateway("");
    setDnsPrimary("");
    setDnsSecondary("");
    setAdminEnabled(true);
    setMtu(1500);
    setVlanId("");
    setIsEditMode(false);

    setIpErr("");
    setMaskErr("");
    setMtuErr("");
    setVlanErr("");
  };

  const handleEditClick = (inf) => {
    setShowForm(true);
    setIsEditMode(true);
    setIntfName(inf.interface_name);
    setIpMode(inf.ip_mode || "static");
    setIpAddress(inf.ip_address || "");
    setSubnetMask(inf.subnet_mask || "");
    setGateway(inf.gateway || "");
    setDnsPrimary(inf.dns_primary || "");
    setDnsSecondary(inf.dns_secondary || "");
    setAdminEnabled(inf.admin_enabled !== false);
    setMtu(inf.mtu || 1500);
    setVlanId(inf.vlan_id ? String(inf.vlan_id) : "");
  };

  const handleCancelEdit = () => {
    clearForm();
    setShowForm(false);
  };

  const handleNewInterface = () => {
    clearForm();
    setShowForm(true);
  };

  // Interface Silme
  const handleDelete = async (ifaceName) => {
    if (!window.confirm(`${ifaceName} arayüzünü silmek istediğinize emin misiniz?`)) return;
    try {
      const token = localStorage.getItem("token");
      const url = `http://127.0.0.1:8000/network/interfaces/${ifaceName}`;
      const res = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || "Silindi");
      fetchInterfaces();
    } catch (err) {
      alert("Silme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const formatDateIstanbul = (isoString) => {
    if (!isoString) return "-";
    const dt = new Date(isoString);
    return dt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  };

  return (
    <div>
      <h2 className="dashboard-title">Network Interface Ayarları</h2>

      <div className="mb-3">
        <button className="btn btn-primary" onClick={handleNewInterface}>
          Yeni Interface Ekle
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-header">Mevcut Interface Ayarları</div>
        <div className="card-body p-0">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Arayüz Adı</th>
                <th>Mode</th>
                <th>IP/Subnet</th>
                <th>Gateway</th>
                <th>DNS Primary</th>
                <th>DNS Secondary</th>
                <th>Admin</th>
                <th>Link State</th>
                <th>MTU</th>
                <th>VLAN</th>
                <th>Güncellendi</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {interfaces.map((inf) => (
                <tr key={inf._id}>
                  <td>{inf.interface_name}</td>
                  <td>{inf.ip_mode}</td>
                  <td>
                    {inf.ip_address || "-"} / {inf.subnet_mask || "-"}
                  </td>
                  <td>{inf.gateway || "-"}</td>
                  <td>{inf.dns_primary || "-"}</td>
                  <td>{inf.dns_secondary || "-"}</td>
                  <td>{inf.admin_enabled ? "Enabled" : "Disabled"}</td>
                  <td>{inf.link_state || "?"}</td>
                  <td>{inf.mtu || "-"}</td>
                  <td>{inf.vlan_id || "-"}</td>
                  <td>{formatDateIstanbul(inf.updated_at)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => handleEditClick(inf)}
                    >
                      Düzenle
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(inf.interface_name)}
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

      {showForm && (
        <div className="card">
          <div className="card-header">
            {isEditMode ? "Arayüz Düzenle" : "Yeni/Değiştir IP Ayarı"}
          </div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label">Interface Adı</label>
                <input
                  className="form-control"
                  value={intfName}
                  onChange={(e) => setIntfName(e.target.value)}
                  disabled={isEditMode}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Mode (DHCP / Static)</label>
                <select
                  className="form-select"
                  value={ipMode}
                  onChange={(e) => setIpMode(e.target.value)}
                >
                  <option value="static">Statik</option>
                  <option value="dhcp">DHCP</option>
                </select>
              </div>

              {ipMode === "static" && (
                <>
                  <div className="mb-3">
                    <label>IP Address</label>
                    <input
                      className="form-control"
                      value={ipAddress}
                      onChange={handleIpChange}
                    />
                    {ipErr && <small style={{ color: "red" }}>{ipErr}</small>}
                  </div>

                  <div className="mb-3">
                    <label>Subnet Mask</label>
                    <input
                      className="form-control"
                      value={subnetMask}
                      onChange={handleMaskChange}
                    />
                    {maskErr && <small style={{ color: "red" }}>{maskErr}</small>}
                  </div>

                  <div className="mb-3">
                    <label>Gateway (opsiyonel)</label>
                    <input
                      className="form-control"
                      value={gateway}
                      onChange={(e) => setGateway(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label>DNS Primary (opsiyonel)</label>
                    <input
                      className="form-control"
                      value={dnsPrimary}
                      onChange={(e) => setDnsPrimary(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label>DNS Secondary (opsiyonel)</label>
                    <input
                      className="form-control"
                      value={dnsSecondary}
                      onChange={(e) => setDnsSecondary(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={adminEnabled}
                  onChange={(e) => setAdminEnabled(e.target.checked)}
                  id="chkAdmin"
                />
                <label className="form-check-label" htmlFor="chkAdmin">
                  Arayüz Etkin (Up/Down)
                </label>
              </div>

              <div className="mb-3">
                <label>MTU</label>
                <input
                  type="number"
                  className="form-control"
                  value={mtu}
                  onChange={handleMtuChange}
                />
                {mtuErr && <small style={{ color: "red" }}>{mtuErr}</small>}
              </div>

              <div className="mb-3">
                <label>VLAN ID (opsiyonel)</label>
                <input
                  type="number"
                  className="form-control"
                  value={vlanId}
                  onChange={handleVlanChange}
                />
                {vlanErr && <small style={{ color: "red" }}>{vlanErr}</small>}
              </div>

              <button type="submit" className="btn btn-primary me-2">
                {isEditMode ? "Güncelle" : "Kaydet"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                Vazgeç
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkInterfacesPage;
