import React from 'react';
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
  BarChart,
  Bar,
} from 'recharts';

const AdminHome = () => {
  // 1. 線香營收趋势 (YoY 去年與今年對比)
  const revenueTrend = [
    { name: '1月', thisYear: 125000, lastYear: 98000 },
    { name: '2月', thisYear: 148000, lastYear: 110000 },
    { name: '3月', thisYear: 182000, lastYear: 135000 },
    { name: '4月', thisYear: 165000, lastYear: 152000 },
    { name: '5月', thisYear: 210000, lastYear: 168000 },
    { name: '6月', thisYear: 285000, lastYear: 195000 },
  ];

  // 2. 香種銷售佔比 (真實線香分類)
  const fragranceData = [
    { name: '芽莊沈香', value: 450 },
    { name: '老山檀香', value: 380 },
    { name: '落日餘暉', value: 210 },
    { name: '高山初雪', value: 155 },
  ];
  const COLORS = ['#2C3E50', '#8E44AD', '#16A085', '#D35400'];

  // 3. 待處理客訴 (線香實務場景)
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
    <div className="container-fluid px-4 py-4 dashboard-wrapper">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>
            ENSO 營運總覽
          </h2>
          <p className="text-muted small">歡迎回來，這是今天的品牌數據表現</p>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card custom-card gradient-primary text-white h-100">
            <div className="card-body">
              <h6 className="small text-uppercase opacity-75">
                累計營收 (NTD)
              </h6>
              <h2 className="fw-bold mb-2">$1,215,000</h2>
              <div className="small">
                <span className="text-success fw-bold">↑ 22%</span> 較去年增長
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card custom-card h-100 shadow-sm border-0">
            <div className="card-body">
              <h6 className="small text-uppercase text-muted">平均客單價</h6>
              <h2 className="fw-bold mb-2">$3,250</h2>
              <div className="small text-muted">包含高階沈香系列</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card custom-card h-100 shadow-sm border-0">
            <div className="card-body">
              <h6 className="small text-uppercase text-muted">
                好評率 (Rating)
              </h6>
              <h2 className="fw-bold mb-2" style={{ color: '#F5A623' }}>
                4.95 / 5
              </h2>
              <div className="small text-muted">共 1,240 則評價</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card custom-card h-100 shadow-sm border-0 border-start border-danger border-4">
            <div className="card-body">
              <h6 className="small text-uppercase text-muted">待處理客訴</h6>
              <h2 className="fw-bold text-danger mb-2">3</h2>
              <div className="small text-muted text-truncate">
                包含 1 件緊急異常
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 圖表 Row */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card custom-card h-100 shadow-sm border-0">
            <div className="card-body pb-0">
              <h5 className="card-title fw-bold">月度銷售趨勢 (YoY)</h5>
              <div style={{ height: 350, marginTop: '20px' }}>
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
                      name="去年"
                      dataKey="lastYear"
                      stroke="#cbd5e0"
                      fill="transparent"
                      strokeDasharray="5 5"
                    />
                    <Area
                      type="monotone"
                      name="今年"
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
          <div className="card custom-card h-100 shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">熱門香種分佈</h5>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fragranceData}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {fragranceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-2">
        {/* 待處理任務清單 */}
        <div className="col-md-6">
          <div className="card custom-card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-3">營運待辦事項</h5>
              <div className="list-group list-group-flush">
                {priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center"
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
        {/* 其他營運狀態 */}
        <div className="col-md-6">
          <div className="card custom-card shadow-sm border-0 bg-light">
            <div className="card-body d-flex flex-column justify-content-center align-items-center text-center p-5">
              <div className="display-4 mb-2">🌿</div>
              <h5 className="fw-bold">品牌格調提示</h5>
              <p className="text-muted">
                目前的銷售主力為「芽莊沈香」，建議針對此分類進行更深度的主題推廣。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
