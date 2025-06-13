// File: src/pages/BlockedPacketsPage.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";

function BlockedPacketsPage() {
  const [packets, setPackets] = useState([]);

  useEffect(() => {
    fetchBlocked();
  }, []);

  const fetchBlocked = async () => {
    try {
      const token = localStorage.getItem("token");
      // Artık /logs/blocked endpointini çağırıyoruz
      const res = await axios.get("http://127.0.0.1:8000/logs/blocked", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPackets(res.data);
    } catch (err) {
      alert("Engellenen paketler çekilemedi: " + err.message);
    }
  };

  return (
    <div>
      <h2>Engellenen Paketler</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Zaman</th>
            <th>Ham Log Satırı</th>
          </tr>
        </thead>
        <tbody>
          {packets.map((p) => (
            <tr key={p._id}>
              <td>{p.timestamp}</td>
              <td>{p.raw_log_line}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BlockedPacketsPage;
