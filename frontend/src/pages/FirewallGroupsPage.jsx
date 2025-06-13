// File: src/pages/FirewallGroupsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

function FirewallGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [grpName, setGrpName] = useState("");
  const [grpDesc, setGrpDesc] = useState("");

  const [showGroupRules, setShowGroupRules] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rules, setRules] = useState([]);

  // ilk yüklemede grupları çek
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/firewall/groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
    } catch (err) {
      alert("Grup listesi alınamadı: " + err.message);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!grpName) {
      alert("Grup adı giriniz");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const body = { group_name: grpName, description: grpDesc };
      const res = await axios.post("http://127.0.0.1:8000/firewall/groups", body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      setGrpName("");
      setGrpDesc("");
      fetchGroups(); // Listeyi güncelle
    } catch (err) {
      alert("Grup ekleme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Grup '${group.group_name}' silinsin mi?`)) return;
    try {
      const token = localStorage.getItem("token");
      const url = `http://127.0.0.1:8000/firewall/groups/${group._id}`;
      const res = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchGroups();
    } catch (err) {
      alert("Grup silme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEnableDisable = async (group, enable) => {
    const confirmMsg = enable
      ? `Grup '${group.group_name}' kuralları ETKİNLEŞTİRİLSİN mi?`
      : `Grup '${group.group_name}' kuralları PASİFLEŞTİRİLSİN mi?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("token");
      const url = `http://127.0.0.1:8000/firewall/groups/${group._id}/enable?enable=${enable}`;
      const res = await axios.patch(url, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
    } catch (err) {
      alert("Grup enable/disable hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleShowRules = async (group) => {
    try {
      const token = localStorage.getItem("token");
      const url = `http://127.0.0.1:8000/firewall/groups/${group._id}/rules`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRules(res.data);
      setSelectedGroup(group);
      setShowGroupRules(true);
    } catch (err) {
      alert("Grup kuralları listelenemedi: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">Kural Grupları</h2>

      {/* Grupların Listesi */}
      <div className="card mb-3">
        <div className="card-header">Mevcut Gruplar</div>
        <div className="card-body p-0">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Grup Adı</th>
                <th>Açıklama</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g._id}>
                  <td>{g.group_name}</td>
                  <td>{g.description || "-"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info me-2"
                      onClick={() => handleShowRules(g)}
                    >
                      Kuralları Gör
                    </button>
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={() => handleEnableDisable(g, true)}
                    >
                      Etkin
                    </button>
                    <button
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => handleEnableDisable(g, false)}
                    >
                      Pasif
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteGroup(g)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-3 text-center">
                    Henüz grup tanımlı değil.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni Grup Ekle */}
      <div className="card mb-4">
        <div className="card-header">Yeni Grup Ekle</div>
        <div className="card-body">
          <form onSubmit={handleCreateGroup}>
            <div className="mb-3">
              <label>Grup Adı</label>
              <input
                className="form-control"
                value={grpName}
                onChange={(e) => setGrpName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label>Açıklama</label>
              <input
                className="form-control"
                value={grpDesc}
                onChange={(e) => setGrpDesc(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Ekle</button>
          </form>
        </div>
      </div>

      {/* Seçilmiş grubun kuralları */}
      {showGroupRules && selectedGroup && (
        <div className="card">
          <div className="card-header">
            “{selectedGroup.group_name}” grubundaki kurallar
            <button
              className="btn btn-sm btn-secondary float-end"
              onClick={() => setShowGroupRules(false)}
            >
              Kapat
            </button>
          </div>
          <div className="card-body p-0">
            {rules.length === 0 ? (
              <div className="p-3">Bu grupta hiç kural yok.</div>
            ) : (
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Kural Adı</th>
                    <th>Action</th>
                    <th>Port</th>
                    <th>Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r._id}>
                      <td>{r.rule_name}</td>
                      <td>{r.action}</td>
                      <td>{r.port || "-"}</td>
                      <td>{r.enabled ? "Evet" : "Hayır"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FirewallGroupsPage;
