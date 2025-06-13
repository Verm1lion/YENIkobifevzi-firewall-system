// File: src/pages/FirewallRulesPage.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

function FirewallRulesPage() {
  const [rules, setRules] = useState([]);
  const [groups, setGroups] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form alanları
  const [ruleId, setRuleId] = useState(null);
  const [ruleName, setRuleName] = useState("");
  const [sourceIps, setSourceIps] = useState("");
  const [port, setPort] = useState("");
  const [protocol, setProtocol] = useState("TCP"); // TCP/UDP/ANY
  const [action, setAction] = useState("ALLOW");
  const [direction, setDirection] = useState("OUT");
  const [profile, setProfile] = useState("Any");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(100);

  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState([]);

  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    fetchRules();
    fetchGroups();
  }, []);

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/firewall/rules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRules(res.data);
    } catch (err) {
      alert("Kural listesi alınamadı: " + err.message);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://127.0.0.1:8000/firewall/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(res.data);
    } catch (err) {
      console.error("Grup listesi alınamadı:", err);
    }
  };

  const clearForm = () => {
    setRuleId(null);
    setRuleName("");
    setSourceIps("");
    setPort("");
    setProtocol("TCP");
    setAction("ALLOW");
    setDirection("OUT");
    setProfile("Any");
    setDescription("");
    setEnabled(true);
    setPriority(100);
    setScheduleStart("");
    setScheduleEnd("");
    setDaysOfWeek([]);
    setGroupId("");
  };

  const handleNewRule = () => {
    clearForm();
    setIsEditMode(false);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    // Kaynak IP(ler) virgülle ayrılabilir: "10.36.130.28, 192.168.1.5"
    const ipsArr = sourceIps
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i);

    const body = {
      rule_name: ruleName,
      source_ips: ipsArr,       // array
      port: port,               // "80,443" girilmişse string
      protocol: protocol,       // "TCP"/"UDP"/"ANY"
      action: action,
      direction: direction,     // "IN"/"OUT"
      profile: profile,         // "Any"/"Domain"/"Private"/"Public"
      description: description,
      enabled: enabled,
      priority: Number(priority),
      schedule_start: scheduleStart || null,
      schedule_end: scheduleEnd || null,
      days_of_week: daysOfWeek.map(d => parseInt(d, 10)),
      group_id: groupId || null
    };

    try {
      if (!isEditMode) {
        // POST -> kural ekle
        const res = await axios.post("http://127.0.0.1:8000/firewall/rules", body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(res.data.message);
      } else {
        // PUT -> güncelle
        const url = `http://127.0.0.1:8000/firewall/rules/${ruleId}`;
        const res = await axios.put(url, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(res.data.message);
      }
      setShowForm(false);
      fetchRules();
    } catch (err) {
      alert("Kural kaydedilemedi: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (r) => {
    setIsEditMode(true);
    setShowForm(true);
    setRuleId(r._id);
    setRuleName(r.rule_name || "");
    setSourceIps(r.source_ips?.join(", ") || "");
    setPort(r.port || "");
    setProtocol(r.protocol || "TCP");
    setAction(r.action || "ALLOW");
    setDirection(r.direction || "OUT");
    setProfile(r.profile || "Any");
    setDescription(r.description || "");
    setEnabled(r.enabled !== false);
    setPriority(r.priority || 100);
    setScheduleStart(r.schedule_start || "");
    setScheduleEnd(r.schedule_end || "");
    setDaysOfWeek(r.days_of_week || []);
    setGroupId(r.group_id || "");
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`'${r.rule_name}' kuralını silmek istediğinize emin misiniz?`)) return;
    try {
      const token = localStorage.getItem("token");
      const url = `http://127.0.0.1:8000/firewall/rules/${r._id}`;
      const res = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data.message);
      fetchRules();
    } catch (err) {
      alert("Silme hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const arr = Array.from(rules);
    const [removed] = arr.splice(source.index, 1);
    arr.splice(destination.index, 0, removed);
    setRules(arr);
    // Priority güncellemesi istersen backend'e de iletebilirsin.
  };

  // Haftanın günleri tıklandığında
  const handleDayCheck = (idx) => {
    if (daysOfWeek.includes(idx)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== idx));
    } else {
      setDaysOfWeek([...daysOfWeek, idx]);
    }
  };

  const getGroupName = (gid) => {
    if (!gid) return "-";
    const g = groups.find((item) => item._id === gid);
    return g ? g.group_name : "(Silinmiş Grup)";
  };

  return (
    <div>
      <h2 className="dashboard-title">Firewall Kuralları (Zamanlama Destekli)</h2>

      <button className="btn btn-success mb-3" onClick={handleNewRule}>
        Yeni Kural Ekle
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="firewall-rules-list">
          {(provided) => (
            <table
              className="table table-striped"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kural Adı</th>
                  <th>Grup</th>
                  <th>Action</th>
                  <th>Protocol</th>
                  <th>Port</th>
                  <th>Source IP</th>
                  <th>Direction</th>
                  <th>Zamanlama</th>
                  <th>Enabled</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r, index) => {
                  const gName = getGroupName(r.group_id);
                  const ipList = r.source_ips?.join(", ") || "-";

                  let scheduleInfo = "-";
                  if (r.schedule_start && r.schedule_end) {
                    if (r.days_of_week && r.days_of_week.length > 0) {
                      const dayLabels = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
                      const dayStr = r.days_of_week.map(d => dayLabels[d] || "?").join(",");
                      scheduleInfo = `${r.schedule_start}-${r.schedule_end} (${dayStr})`;
                    } else {
                      scheduleInfo = `${r.schedule_start}-${r.schedule_end}`;
                    }
                  }

                  return (
                    <Draggable key={r._id} draggableId={r._id} index={index}>
                      {(prov) => (
                        <tr
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                        >
                          <td>{index + 1}</td>
                          <td>{r.rule_name}</td>
                          <td>{gName}</td>
                          <td>{r.action}</td>
                          <td>{r.protocol}</td>
                          <td>{r.port || "-"}</td>
                          <td>{ipList}</td>
                          <td>{r.direction}</td>
                          <td>{scheduleInfo}</td>
                          <td>{r.enabled ? "Evet" : "Hayır"}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => handleEdit(r)}
                            >
                              Düzenle
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(r)}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </tbody>
            </table>
          )}
        </Droppable>
      </DragDropContext>

      {showForm && (
        <div className="card mt-3">
          <div className="card-header">
            {isEditMode ? "Kuralı Düzenle" : "Yeni Kural Ekle"}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label>Kural Adı</label>
                <input
                  className="form-control"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label>Kaynak IP(ler) (virgülle ayır)</label>
                <input
                  className="form-control"
                  value={sourceIps}
                  onChange={(e) => setSourceIps(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label>Port (virgülle ayır: örn 80,443)</label>
                <input
                  type="text"
                  className="form-control"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="80,443"
                />
              </div>

              <div className="mb-3">
                <label>Protocol</label>
                <select
                  className="form-select"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                >
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ANY">ANY</option>
                </select>
              </div>

              <div className="mb-3">
                <label>Action</label>
                <select
                  className="form-select"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
              </div>

              <div className="mb-3">
                <label>Direction</label>
                <select
                  className="form-select"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>

              <div className="mb-3">
                <label>Profile</label>
                <select
                  className="form-select"
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                >
                  <option value="Any">Any</option>
                  <option value="Domain">Domain</option>
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                </select>
              </div>

              <div className="mb-3">
                <label>Açıklama (opsiyonel)</label>
                <input
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="chkEnabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <label htmlFor="chkEnabled" className="form-check-label">
                  Kural Etkin
                </label>
              </div>

              <div className="mb-3">
                <label>Öncelik (Priority)</label>
                <input
                  type="number"
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>

              {/* Zaman planlama */}
              <div className="mb-3">
                <label>Zaman Başlangıcı (HH:MM)</label>
                <input
                  type="time"
                  className="form-control"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label>Zaman Sonu (HH:MM)</label>
                <input
                  type="time"
                  className="form-control"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label>Haftanın Günleri</label>
                <div>
                  {["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((lbl, idx) => (
                    <div key={idx} className="form-check form-check-inline">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`chkDay${idx}`}
                        checked={daysOfWeek.includes(idx)}
                        onChange={() => handleDayCheck(idx)}
                      />
                      <label className="form-check-label" htmlFor={`chkDay${idx}`}>
                        {lbl}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grup seçimi */}
              <div className="mb-3">
                <label>Grup (opsiyonel)</label>
                <select
                  className="form-select"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">(Seçiniz)</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary">
                {isEditMode ? "Güncelle" : "Ekle"}
              </button>
              <button
                type="button"
                className="btn btn-secondary ms-2"
                onClick={() => setShowForm(false)}
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

export default FirewallRulesPage;
