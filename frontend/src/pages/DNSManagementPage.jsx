// File: src/pages/DNSManagementPage.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

function DNSManagementPage() {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState("");
  const [useWildcard, setUseWildcard] = useState(true);
  const [note, setNote] = useState("");

  const [adblockUrl, setAdblockUrl] = useState("");
  const [adblockStatus, setAdblockStatus] = useState("");

  const [selectedDomains, setSelectedDomains] = useState([]);
  const [dohBlockStatus, setDohBlockStatus] = useState("");

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/dns/domains", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDomains(res.data);
      setSelectedDomains([]);
    } catch (err) {
      alert("Domain listesi çekilemedi: " + err.message);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain) {
      alert("Lütfen domain giriniz.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const body = {
        domain: newDomain.trim().toLowerCase(),
        note,
        use_wildcard: useWildcard
      };
      const res = await axios.post("http://127.0.0.1:8000/dns/domains", body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || "Eklendi");
      setNewDomain("");
      setNote("");
      setUseWildcard(true);
      fetchDomains();
    } catch (err) {
      alert("Domain ekleme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCheckboxChange = (domainObj) => {
    const domainName = domainObj.domain;
    if (selectedDomains.includes(domainName)) {
      setSelectedDomains(selectedDomains.filter((d) => d !== domainName));
    } else {
      setSelectedDomains([...selectedDomains, domainName]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const all = domains.map((d) => d.domain);
      setSelectedDomains(all);
    } else {
      setSelectedDomains([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDomains.length === 0) {
      alert("Hiç domain seçmediniz.");
      return;
    }
    if (!window.confirm(`Seçili ${selectedDomains.length} domaini silmek istiyor musunuz?`)) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      for (const dom of selectedDomains) {
        await axios.delete(`http://127.0.0.1:8000/dns/domains/${encodeURIComponent(dom)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      alert("Seçili domainler silindi");
      fetchDomains();
    } catch (err) {
      alert("Toplu silme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteDomain = async (domainObj) => {
    if (!window.confirm(`"${domainObj.domain}" adlı kaydı silmek istiyor musunuz?`)) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://127.0.0.1:8000/dns/domains/${encodeURIComponent(domainObj.domain)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Silindi");
      fetchDomains();
    } catch (err) {
      alert("Silme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleAdblockImport = async () => {
    if (!adblockUrl) {
      alert("Adblock liste URL'si giriniz!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      setAdblockStatus("İndiriliyor...");
      const body = { url: adblockUrl };
      const res = await axios.post("http://127.0.0.1:8000/dns/adblocklist", body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdblockStatus(res.data.message || "Tamam");
      fetchDomains();
    } catch (err) {
      setAdblockStatus("Hata: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleBlockDoH = async () => {
    try {
      setDohBlockStatus("DoH sunucuları engelleniyor...");
      const token = localStorage.getItem("token");
      const res = await axios.post("http://127.0.0.1:8000/dns/doh-block", null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDohBlockStatus(res.data.message || "DoH IP’ler engellendi");
    } catch (err) {
      setDohBlockStatus("Hata: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h2 className="dashboard-title">DNS Yönetimi</h2>

      <div className="card mb-3">
        <div className="card-header">Domain Engelleme</div>
        <div className="card-body">
          <form onSubmit={handleAddDomain} className="mb-3">
            <div className="mb-3">
              <label>Domain</label>
              <input
                className="form-control"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="chkWildcard"
                checked={useWildcard}
                onChange={(e) => setUseWildcard(e.target.checked)}
              />
              <label htmlFor="chkWildcard" className="form-check-label">
                Alt alan adları da engellensin (wildcard)
              </label>
            </div>
            <div className="mb-3">
              <label>Not</label>
              <input
                className="form-control"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit">Ekle</button>
          </form>

          <div className="d-flex mb-2">
            <button
              className="btn btn-danger me-3"
              onClick={handleDeleteSelected}
            >
              Seçilenleri Sil
            </button>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="chkSelectAll"
                checked={domains.length > 0 && selectedDomains.length === domains.length}
                onChange={handleSelectAll}
              />
              <label htmlFor="chkSelectAll" className="form-check-label ms-1">
                Tümünü Seç
              </label>
            </div>
          </div>

          <table className="table table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Domain</th>
                <th>Wildcard</th>
                <th>Not</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((item, idx) => (
                <tr key={item._id}>
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input me-2"
                      checked={selectedDomains.includes(item.domain)}
                      onChange={() => handleCheckboxChange(item)}
                    />
                    {idx + 1}
                  </td>
                  <td>{item.domain}</td>
                  <td>{item.use_wildcard ? "Evet" : "Hayır"}</td>
                  <td>{item.note || "-"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleDeleteDomain(item)}
                    >
                      Sil (tekli)
                    </button>
                  </td>
                </tr>
              ))}
              {domains.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center">
                    Henüz engelli domain yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">Reklam/Tracker Liste Ekle</div>
        <div className="card-body">
          <div className="mb-3">
            <label>Adblock Liste URL</label>
            <input
              className="form-control"
              value={adblockUrl}
              onChange={(e) => setAdblockUrl(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleAdblockImport}>
            Liste İndir ve Ekle
          </button>
          {adblockStatus && (
            <div className="alert alert-info mt-2">{adblockStatus}</div>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">DNS Over HTTPS Engelle</div>
        <div className="card-body">
          <button className="btn btn-warning" onClick={handleBlockDoH}>
            DNS over HTTPS Engelle
          </button>
          {dohBlockStatus && (
            <div className="alert alert-info mt-2">{dohBlockStatus}</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Yerleşik DNS Sunucusu</div>
        <div className="card-body">
          <p>
            /etc/hosts veya basit conf kısıtlı olabilir.
            dnsmasq/bind9 gibi tam bir DNS forwarder vb...
          </p>
        </div>
      </div>
    </div>
  );
}

export default DNSManagementPage;
