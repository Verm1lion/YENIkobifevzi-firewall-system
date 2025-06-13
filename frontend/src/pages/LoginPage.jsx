// File: src/pages/LoginPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // useNavigate, login başarılı olduğunda /dashboard’a yönlendirmek için
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const res = await axios.post("http://127.0.0.1:8000/auth/login", {
        username,
        password
      });

      // Eğer login başarılı oldu ve access_token geldiyse:
      if (res.data.access_token) {
        // 1) Token'ı localStorage’e yaz
        localStorage.setItem("token", res.data.access_token);
        // 2) /dashboard sayfasına yönlendir
        navigate("/dashboard");
      } else {
        alert("Sunucu geçerli bir token döndürmedi. Lütfen kontrol edin.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Giriş hatası: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{ backgroundColor: "#f3f4f6" }}
    >
      <div className="card shadow" style={{ width: "420px" }}>
        <div className="card-header text-center bg-primary text-white">
          <h4 className="mb-0">NetGate Firewall Login</h4>
        </div>
        <div className="card-body">
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Kullanıcı Adı</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Parola</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Giriş
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
