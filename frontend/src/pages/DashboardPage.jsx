// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';

// Chart.js kurarken gerekebilecek register'lar (eğer ChartJS v3+ kullanıyorsanız)
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function DashboardPage() {
  const [cpuUsage, setCpuUsage] = useState(35);   // başlangıçta %35

  // Rastgele CPU değeri simülasyonu
  useEffect(() => {
    const interval = setInterval(() => {
      const randomVal = Math.floor(Math.random() * 100);
      setCpuUsage(randomVal);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Doughnut chart verisi
  // İki dilimli grafik: birincisi "kullanılan", ikincisi "kalan"
  const data = {
    labels: ['Kullanılan', 'Boş'],
    datasets: [
      {
        data: [cpuUsage, 100 - cpuUsage],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',  // Mavi ton, kullanılan
          'rgba(201, 203, 207, 0.3)'  // Gri ton, boş
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: '60%',       // doughnut'un ortasındaki boşluk genişliği
    plugins: {
      legend: {
        display: false   // İsterseniz legend'ı kapatabilir veya özelleştirebilirsiniz
      },
      tooltip: {
        // tooltip ayarları
      },
    },
  };

  return (
    <div className="dashboard-container">
      <h2 className="mb-4">Ana Sayfa (Dashboard)</h2>

      {/* Örnek 4 kolonluk grid (isteğe göre layout) */}
      <div className="row g-3">
        {/* CPU Kullanımı */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header text-center">CPU Kullanımı</div>
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <div style={{ width: '150px', height: '150px' }}>
                <Doughnut data={data} options={options} />
              </div>
              <h5 className="mt-2">
                {cpuUsage}%
              </h5>
            </div>
          </div>
        </div>

        {/* Bellek Kullanımı (örnek statik gösterim) */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header text-center">Bellek Kullanımı</div>
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <div style={{ width: '150px', height: '150px' }}>
                {/* Bellek için de benzer Doughnut ekleyebilirsiniz */}
                {/* Bu örnek sabit %62 gösteriyor */}
                <Doughnut
                  data={{
                    labels: ['Kullanılan', 'Boş'],
                    datasets: [
                      {
                        data: [62, 38],
                        backgroundColor: [
                          'rgba(255, 99, 132, 0.8)', // kırmızı ton
                          'rgba(201, 203, 207, 0.3)'
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    cutout: '60%',
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
              <h5 className="mt-2">
                62%
              </h5>
            </div>
          </div>
        </div>

        {/* Uptime Kartı */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header text-center">Uptime</div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <h4>23s 45dk</h4>
            </div>
          </div>
        </div>

        {/* Aktif Bağlantı Kartı */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header text-center">Aktif Bağlantı</div>
            <div className="card-body d-flex align-items-center justify-content-center">
              <h4>120</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Ağ Trafiği Alanı & Anlık Tehditler & Hızlı Erişim */}
      <div className="row mt-3">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">Ağ Trafiği (Canlı Grafik)</div>
            <div className="card-body text-center" style={{ height: '200px' }}>
              [Trafik Grafiği placeholder]
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Anlık Tehditler */}
          <div className="card mb-3">
            <div className="card-header">Anlık Tehditler</div>
            <div className="card-body">
              <p>Şüpheli IP: 10.0.0.15</p>
              <p>Engellenen Port: 23 (Telnet)</p>
              <p>Bekleyen Alarm: 2 Güvenlik Uyarısı</p>
            </div>
          </div>
          {/* Hızlı Erişim */}
          <div className="card">
            <div className="card-header">Hızlı Erişim</div>
            <div className="card-body">
              <button className="btn btn-outline-primary w-100 mb-2">Log Görüntüle</button>
              <button className="btn btn-outline-primary w-100 mb-2">Kural Yönetimi</button>
              <button className="btn btn-outline-primary w-100">Sistem Güncelle</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default DashboardPage;
