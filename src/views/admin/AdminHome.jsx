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
  const [sensors, setSensors] = useState({
    tempA: 22.5,
    humidityA: 48,
    tempB: 23.1,
    humidityB: 50,
    lastUpdate: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors((prev) => ({
        tempA: +(prev.tempA + (Math.random() - 0.5) * 0.2).toFixed(1),
        humidityA: Math.min(100, Math.max(0, +(prev.humidityA + (Math.random() - 0.5)).toFixed(0))),
        tempB: +(prev.tempB + (Math.random() - 0.5) * 0.2).toFixed(1),
        humidityB: Math.min(100, Math.max(0, +(prev.humidityB + (Math.random() - 0.5)).toFixed(0))),
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
  const COLORS = ['#111111', '#984443', '#3A4D39', '#735C00'];

  const priorityTasks = [
    { id: 'C-8821', issue: '客戶反映沈香氣味不同', level: 'High', date: '2hr ago' },
    { id: 'C-8825', issue: '物流導致線香斷裂', level: 'Medium', date: '5hr ago' },
    { id: 'C-8830', issue: '沉水級香材保養諮詢', level: 'Low', date: '1d ago' },
  ];

  return (
    <div className="p-6 md:p-10">
      {/* 標題與實時狀態 */}
      <div className="flex flex-wrap items-end justify-between mb-12 gap-6 border-b border-[#D1C7B7] pb-8">
        <div>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-[#111111] mb-2">
            盤面總覽
          </h2>
          <p className="text-xs uppercase tracking-[0.4em] opacity-40 italic">
            Dashboard • Real-time Monitoring • {sensors.lastUpdate}
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white border border-[#984443]/30 text-[#984443] rounded-sm text-[0.7rem] uppercase tracking-widest shadow-sm ring-1 ring-[#984443]/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#984443] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#984443]"></span>
          </span>
          MQTT 數據流穩定
        </div>
      </div>

      {/* 核心指標卡片 (Museum Exhibition Label Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <div className="bg-[#111111] text-[#FAF9F6] p-8 rounded-sm shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl font-serif">¥</div>
          <h6 className="text-[0.6rem] uppercase tracking-[0.3em] font-bold mb-6 opacity-60">累計營收 (NTD)</h6>
          <div className="font-serif text-4xl font-medium mb-3 tracking-tighter">$1,215,000</div>
          <div className="text-[0.7rem] opacity-80 flex items-center gap-2">
            <span className="text-[#984443] font-bold">↑ 22%</span> <span>較去年增長</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-sm shadow-sm border border-[#D1C7B7] relative group hover:border-[#111111] transition-kyoto">
          <h6 className="text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111] opacity-40 mb-6">倉儲環境狀態</h6>
          <div className="font-serif text-3xl font-medium text-[#111111] mb-3">
            {sensors.tempA}°<span className="text-sm opacity-40 ml-1">C</span> / {sensors.humidityA}<span className="text-sm opacity-40 ml-1">%</span>
          </div>
          <div className={`text-[0.65rem] font-bold uppercase tracking-[0.2em] ${sensors.humidityA > 60 ? 'text-[#984443]' : 'text-[#3A4D39]'}`}>
            {sensors.humidityA > 60 ? '⚠️ Humidity Warning' : '🟢 System Optimal'}
          </div>
        </div>

        <div className="bg-white p-8 rounded-sm shadow-sm border border-[#D1C7B7] hover:border-[#111111] transition-kyoto">
          <h6 className="text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111] opacity-40 mb-6">平均客單價</h6>
          <div className="font-serif text-3xl font-medium text-[#111111] mb-3">$3,250</div>
          <div className="text-[0.65rem] opacity-30 italic tracking-wider">Premium Series Included</div>
        </div>

        <div className="bg-white p-8 rounded-sm shadow-sm border border-[#D1C7B7] hover:border-[#111111] transition-kyoto">
          <h6 className="text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111] opacity-40 mb-6">品牌好評率</h6>
          <div className="font-serif text-3xl font-medium text-[#735C00] mb-3">4.95 / 5.0</div>
          <div className="text-[0.65rem] opacity-30 italic tracking-wider">Based on 1,240 reviews</div>
        </div>
      </div>

      {/* 圖表分佈 - 藝術策展風格 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-8 bg-white p-10 rounded-sm shadow-sm border border-[#D1C7B7]">
          <div className="flex items-center justify-between mb-10">
            <h5 className="font-serif text-2xl font-medium flex items-center gap-4">
              年度銷售趨勢對比
              <span className="text-[0.6rem] uppercase tracking-[0.3em] opacity-30 font-sans mt-1">Year-over-Year Analysis</span>
            </h5>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorTY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111111" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#111111', opacity: 0.4, fontSize: 11, letterSpacing: '2px'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#111111', opacity: 0.4, fontSize: 11}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#FAF9F6', border: '1px solid #D1C7B7', borderRadius: '0px', boxShadow: 'none'}} 
                  itemStyle={{fontFamily: 'Noto Serif JP', fontSize: '13px'}}
                />
                <Legend verticalAlign="top" align="right" height={40} iconType="rect" iconSize={8} />
                <Area type="monotone" name="LY Period" dataKey="lastYear" stroke="#D1C7B7" fill="transparent" strokeDasharray="3 3" />
                <Area type="monotone" name="Current Performance" dataKey="thisYear" stroke="#111111" fill="url(#colorTY)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-10 rounded-sm shadow-sm border border-[#D1C7B7] flex flex-col items-center">
          <h5 className="font-serif text-2xl font-medium mb-10 self-start">熱門商域</h5>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fragranceData} innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value" cx="50%" cy="45%">
                  {fragranceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#FAF9F6', border: '1px solid #D1C7B7', borderRadius: '0px'}} />
                <Legend layout="vertical" verticalAlign="bottom" align="center" iconType="circle" iconSize={6} wrapperStyle={{paddingTop: '20px', fontSize: '12px', opacity: 0.6}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 底部模組: 待辦與終端日誌 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-sm shadow-sm border border-[#D1C7B7]">
          <h5 className="font-serif text-2xl font-medium mb-8 border-b border-[#D1C7B7] pb-4">待辦事項</h5>
          <div className="divide-y divide-[#D1C7B7]/30">
            {priorityTasks.map((task) => (
              <div key={task.id} className="py-5 flex justify-between items-center group cursor-pointer hover:pl-2 transition-all duration-500">
                <div>
                  <div className="font-medium text-sm text-[#111111] group-hover:text-[#984443] transition-colors">{task.issue}</div>
                  <small className="text-[0.65rem] uppercase tracking-[0.2em] text-[#111111]/40">
                    {task.id} • {task.date}
                  </small>
                </div>
                <span className={`px-4 py-1 text-[0.6rem] uppercase tracking-[0.2em] font-bold border ${
                  task.level === 'High' ? 'border-[#984443] text-[#984443]' : 'border-[#735C00] text-[#735C00]'
                }`}>
                  {task.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111111] p-10 rounded-sm shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#984443]/40 to-transparent"></div>
          <h5 className="font-serif text-[0.7rem] uppercase tracking-[0.5em] text-[#FAF9F6] opacity-30 mb-8 border-l border-[#984443] pl-4">
            Terminal Live Log • MQTT
          </h5>
          <div className="font-mono text-[0.7rem] text-[#3A4D39] leading-relaxed flex-grow overflow-auto">
            <div className="mb-2 opacity-60">[{sensors.lastUpdate}] Topic: sensors/zone_a/temp - Received: {sensors.tempA}°C</div>
            <div className="mb-2 opacity-60">[{sensors.lastUpdate}] Topic: sensors/zone_a/hum - Received: {sensors.humidityA}%</div>
            {sensors.humidityA > 60 && (
              <div className="text-[#984443] font-bold mb-2 animate-pulse">
                [ !! ] ALERT: Zone A Humidity threshold exceeded! Immediate dehydration protocol recommended.
              </div>
            )}
            <div className="text-white/20 mt-6 italic pl-4 border-l border-white/10">
              Handshaking with IoT Gateway [v2.4.1]...
            </div>
            <div className="text-white/20 pl-4">Node-08: Signal Strength -72dBm (Fair)</div>
            <div className="text-white/20 pl-4 border-b border-white/5 pb-2 mb-2">Node-09: Signal Strength -45dBm (Excellent)</div>
            <div className="text-[#735C00] opacity-80 animate-pulse mt-4">>> Awaiting packet from Warehouse B...</div>
          </div>
          <div className="mt-8 flex justify-end">
             <div className="w-16 h-[1px] bg-[#FAF9F6]/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;

