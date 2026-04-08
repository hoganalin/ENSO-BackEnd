import React, { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

const AdminHome = () => {
  // --- IoT 實時數據模擬實作 ---
  const [sensors, setSensors] = useState({
    tempA: 22.5,
    humidityA: 48,
    tempB: 23.1,
    humidityB: 50,
    lastUpdate: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    // 模擬 MQTT 數據推送 (每 3 秒產生一次微小變化)
    const interval = setInterval(() => {
      setSensors((prev) => ({
        tempA: +(prev.tempA + (Math.random() - 0.5) * 0.2).toFixed(1),
        humidityA: Math.min(
          100,
          Math.max(0, +(prev.humidityA + (Math.random() - 0.5)).toFixed(0))
        ),
        tempB: +(prev.tempB + (Math.random() - 0.5) * 0.2).toFixed(1),
        humidityB: Math.min(
          100,
          Math.max(0, +(prev.humidityB + (Math.random() - 0.5)).toFixed(0))
        ),
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // --- 圖表數據 ---
  const revenueTrend = [
    { name: '1月', thisYear: 125000, lastYear: 98000 },
    { name: '2月', thisYear: 148000, lastYear: 110000 },
    { name: '3月', thisYear: 182000, lastYear: 135000 },
    { name: '4月', thisYear: 165000, lastYear: 152000 },
    { name: '5月', thisYear: 210000, lastYear: 168000 },
    { name: '6月', thisYear: 285000, lastYear: 195000 },
  ];

  const fragranceData = [
    { name: '芽莊沈香', value: 450 },
    { name: '老山檀香', value: 380 },
    { name: '落日餘暉', value: 210 },
    { name: '高山初雪', value: 155 },
  ];
  const COLORS = ['#2C3E50', '#8E44AD', '#16A085', '#D35400'];

  const priorityTasks = [
    {
      id: 'C-8821',
      issue: '客戶反映沈香氣味與上次不同',
      level: 'High',
      date: '2小時前',
    },
    {
      id: 'C-8825',
      issue: '物流導致線香前端斷裂(3根)',
      level: 'Medium',
      date: '5小時前',
    },
    {
      id: 'C-8830',
      issue: '詢問沉水級香材保養方式',
      level: 'Low',
      date: '1天前',
    },
  ];

  return (
    <div
      className="container-fluid px-4 py-4 dashboard-wrapper"
      style={{ backgroundColor: '#f8f9fa' }}
    >
      {/* 標題與更新頻率 */}
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>
            ENSO 智慧倉儲監控總覽
          </h2>
          <p className="text-muted small">
            系統狀態: 運行中 | 最後同步: {sensors.lastUpdate}
          </p>
        </div>
        <div className="badge bg-success-subtle text-success border border-success px-3 py-2 rounded-pill shadow-sm">
          <span className="spinner-grow spinner-grow-sm me-2"></span>
          MQTT 倉儲數據流穩定
        </div>
      </div>

      {/* 核心指標卡片 (KPI Cards) */}
      <div className="row g-2 g-md-4 mb-4">
        {/* 1. 營收卡片 */}
        <div className="col-6 col-md-3">
          <div className="card custom-card gradient-primary text-white border-0 shadow-sm h-100">
            <div className="card-body p-2 p-md-4">
              <h6 className="x-small text-uppercase opacity-75 fw-bold mb-1 mb-md-3" style={{ fontSize: '0.65rem' }}>
                累計營收 (NTD)
              </h6>
              <div className="fw-bold mb-1 fs-6 fs-md-2">$1,215,000</div>
              <div style={{ fontSize: '0.7rem' }}>
                <span className="fw-bold">↑ 22%</span> 較去年增長
              </div>
            </div>
          </div>
        </div>

        {/* 2. 實時倉儲狀態卡片 (動態數值) */}
        <div className="col-6 col-md-3">
          <div className="card custom-card border-0 shadow-sm h-100 text-center d-flex flex-column justify-content-center p-2 p-md-3 bg-white">
            <h6 className="text-uppercase text-muted fw-bold mb-1 mb-md-3" style={{ fontSize: '0.65rem' }}>
              🌡️ 倉儲環境狀態
            </h6>
            <div className="fw-bold text-primary mb-1 fs-6">
              {sensors.tempA}°C / {sensors.humidityA}%
            </div>
            <div
              className={`fw-bold ${sensors.humidityA > 60 ? 'text-danger' : 'text-success'}`}
              style={{ fontSize: '0.7rem' }}
            >
              {sensors.humidityA > 60 ? '⚠️ 濕度警報' : '🟢 運作良好'}
            </div>
          </div>
        </div>

        {/* 3. 客單價卡片 */}
        <div className="col-6 col-md-3">
          <div className="card custom-card border-0 shadow-sm h-100 p-2 p-md-4 bg-white">
            <h6 className="text-uppercase text-muted fw-bold mb-1 mb-md-3" style={{ fontSize: '0.65rem' }}>
              平均客單價
            </h6>
            <div className="fw-bold mb-1 fs-6">$3,250</div>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>包含高階沈香系列</div>
          </div>
        </div>

        {/* 4. 好評率卡片 */}
        <div className="col-6 col-md-3">
          <div className="card custom-card border-0 shadow-sm h-100 p-2 p-md-4 bg-white">
            <h6 className="text-uppercase text-muted fw-bold mb-1 mb-md-3" style={{ fontSize: '0.65rem' }}>
              品牌好評率
            </h6>
            <div className="fw-bold mb-1 fs-6 text-warning">4.95 / 5</div>
            <div className="text-muted" style={{ fontSize: '0.7rem' }}>共 1,240 則五星評價</div>
          </div>
        </div>
      </div>

      {/* 感測器詳細數據細目 (Sensor Details) */}
      <div className="row g-2 g-md-4 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm bg-white p-2 p-md-3">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-2">
                🌡️
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>A 倉溫度</small>
                <div className="fw-bold mb-0">{sensors.tempA} °C</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm bg-white p-2 p-md-3">
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 p-2 rounded-circle me-2">
                💧
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>A 倉濕度</small>
                <div
                  className={`fw-bold mb-0 ${sensors.humidityA > 60 ? 'text-danger' : ''}`}
                >
                  {sensors.humidityA} %
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm bg-white p-2 p-md-3">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-2">
                🌡️
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>B 倉溫度</small>
                <div className="fw-bold mb-0">{sensors.tempB} °C</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm bg-white p-2 p-md-3">
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 p-2 rounded-circle me-2">
                💧
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>B 倉濕度</small>
                <div className="fw-bold mb-0">{sensors.humidityB} %</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 圖表分佈 */}
      <div className="row g-2 g-md-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100 bg-white">
            <div className="card-body p-2 p-md-4">
              <h5 className="card-title fw-bold" style={{ fontSize: '0.95rem' }}>年度銷售趨勢對比 (YoY)</h5>
              <div style={{ height: 200, marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="colorTY" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#4A90E2"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4A90E2"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#eee"
                    />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      type="monotone"
                      name="去年同期"
                      dataKey="lastYear"
                      stroke="#cbd5e0"
                      fill="transparent"
                      strokeDasharray="5 5"
                    />
                    <Area
                      type="monotone"
                      name="今年表現"
                      dataKey="thisYear"
                      stroke="#4A90E2"
                      fillOpacity={1}
                      fill="url(#colorTY)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100 bg-white">
            <div className="card-body p-2 p-md-4">
              <h5 className="card-title fw-bold mb-2" style={{ fontSize: '0.95rem' }}>熱門商品類別</h5>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fragranceData}
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={5}
                      dataKey="value"
                      cx="50%"
                    >
                      {fragranceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      layout="horizontal"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 營運清單與即時日誌 */}
      <div className="row g-4 mt-2">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm bg-white">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">待處理營運事項</h5>
              <div className="list-group list-group-flush">
                {priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center border-bottom"
                  >
                    <div>
                      <div className="fw-bold">{task.issue}</div>
                      <small className="text-muted">
                        {task.id} · {task.date}
                      </small>
                    </div>
                    <span
                      className={`badge rounded-pill ${task.level === 'High' ? 'bg-danger' : 'bg-warning text-dark'}`}
                    >
                      {task.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div
            className="card border-0 shadow-sm bg-dark text-success p-4 rounded-4"
            style={{ minHeight: '320px' }}
          >
            <h5 className="fw-bold mb-3 small text-uppercase text-muted">
              📡 智慧倉儲即時日誌 (MQTT)
            </h5>
            <div
              className="font-monospace small overflow-auto"
              style={{ maxHeight: '250px' }}
            >
              <div className="mb-1">
                [ {sensors.lastUpdate} ] Topic: sensors/warehouse_a/temp -
                Received: {sensors.tempA}°C
              </div>
              <div className="mb-1">
                [ {sensors.lastUpdate} ] Topic: sensors/warehouse_a/hum -
                Received: {sensors.humidityA}%
              </div>
              {sensors.humidityA > 60 && (
                <div className="text-danger fw-bold mb-1">
                  [ ALERT ] Warehouse A Humidity Warning: Exceeds Threshold!
                </div>
              )}
              <div className="text-white-50 mt-2">
                Checking signal strength for Gateways...
              </div>
              <div className="text-white-50">
                Gateway-01 (A-Zone): Status OK
              </div>
              <div className="text-white-50">
                Gateway-02 (B-Zone): Status OK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
