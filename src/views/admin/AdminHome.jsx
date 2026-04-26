import { useEffect, useMemo, useState } from 'react';

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

import { currency } from '../../assets/utils/filter';
import { getAdminOrders } from '../../service/adminOrders';
import { getAdminProducts } from '../../service/adminProducts';
import { fetchCandidates } from '../../service/candidateCases';

const LOW_STOCK_THRESHOLD = 10;
const PIE_COLORS = ['#111111', '#984443', '#3A4D39', '#735C00'];

// orders.products 在 HexSchool API 有時是 array、有時是 object map，統一成 array
const toItemArray = (products) =>
  Array.isArray(products) ? products : Object.values(products || {});

const formatRelative = (iso) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}hr ago`;
  return `${Math.round(h / 24)}d ago`;
};

const AdminHome = () => {
  const [sensors, setSensors] = useState({
    tempA: 22.5,
    humidityA: 48,
    tempB: 23.1,
    humidityB: 50,
    lastUpdate: new Date().toLocaleTimeString(),
  });

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  // IoT 模擬 heartbeat — 仍然是純前端展示
  useEffect(() => {
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

  // 抓真實資料：products / orders / agent candidates
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminProducts(1)
        .then((r) => r.data?.products || [])
        .catch(() => []),
      getAdminOrders(1)
        .then((r) => {
          const raw = r.data?.orders;
          return Array.isArray(raw) ? raw : Object.values(raw || {});
        })
        .catch(() => []),
      fetchCandidates({ status: 'proposed' })
        .then((r) => r.cases || [])
        .catch(() => []),
    ]).then(([p, o, c]) => {
      if (cancelled) return;
      setProducts(p);
      setOrders(o);
      setCandidates(c);
      setDataReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // KPI / 圖表計算 — 純函式，純 useMemo
  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.is_paid);
    const totalRevenue = paidOrders.reduce(
      (s, o) => s + (Number(o.total) || 0),
      0
    );
    const avgOrderValue = paidOrders.length
      ? Math.round(totalRevenue / paidOrders.length)
      : 0;
    const paidRate = orders.length
      ? Math.round((paidOrders.length / orders.length) * 100)
      : 0;

    // 熱門商域：依商品 qty 在已付款訂單中加總
    const productQty = {};
    paidOrders.forEach((o) => {
      toItemArray(o.products).forEach((item) => {
        const title = item?.product?.title;
        if (!title) return;
        productQty[title] = (productQty[title] || 0) + (Number(item.qty) || 0);
      });
    });
    const fragranceData = Object.entries(productQty)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, value]) => ({ name, value }));

    // 月度趨勢：今年最近 6 個月，bucket 同月份去年也填
    const now = new Date();
    const monthBuckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        name: `${d.getMonth() + 1}月`,
        thisYear: 0,
        lastYear: 0,
      });
    }
    const bucketIndex = monthBuckets.reduce((acc, b, idx) => {
      acc[b.key] = idx;
      return acc;
    }, {});

    paidOrders.forEach((o) => {
      const ts = (Number(o.create_at) || Number(o.paid_date) || 0) * 1000;
      if (!ts) return;
      const d = new Date(ts);
      const total = Number(o.total) || 0;
      const thisKey = `${d.getFullYear()}-${d.getMonth()}`;
      const lastKey = `${d.getFullYear() + 1}-${d.getMonth()}`;
      if (bucketIndex[thisKey] != null) {
        monthBuckets[bucketIndex[thisKey]].thisYear += total;
      } else if (bucketIndex[lastKey] != null) {
        monthBuckets[bucketIndex[lastKey]].lastYear += total;
      }
    });

    const lowStock = products
      .filter((p) => (p.inventory ?? 0) < LOW_STOCK_THRESHOLD)
      .sort((a, b) => (a.inventory ?? 0) - (b.inventory ?? 0));

    return {
      totalRevenue,
      avgOrderValue,
      paidRate,
      paidCount: paidOrders.length,
      orderCount: orders.length,
      productCount: products.length,
      fragranceData,
      revenueTrend: monthBuckets,
      lowStock,
    };
  }, [orders, products]);

  // 待辦事項：candidate proposed (前 2) + 低庫存 (前 3)
  const priorityTasks = useMemo(() => {
    const tasks = [];
    candidates.slice(0, 2).forEach((c) => {
      const tag = (c.tags || [])[0] || '';
      const level = tag.includes('safety')
        ? 'High'
        : tag.includes('handoff')
          ? 'Medium'
          : tag.includes('happy')
            ? 'Low'
            : 'Medium';
      tasks.push({
        id: c.id,
        issue: c.expectedBehavior || c.userMessage || '待審 agent case',
        level,
        date: formatRelative(c.createdAt),
        kind: 'agent',
      });
    });
    stats.lowStock.slice(0, 3).forEach((p) => {
      const inv = p.inventory ?? 0;
      tasks.push({
        id: `INV-${p.id}`,
        issue: `${p.title} 庫存 ${inv === 0 ? '已售罄' : `僅剩 ${inv}`}`,
        level: inv === 0 ? 'High' : 'Medium',
        date: '即時',
        kind: 'inventory',
      });
    });
    return tasks.slice(0, 5);
  }, [candidates, stats.lowStock]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-3 py-3 md:px-6 md:py-12 font-sans text-[#111111]">
      {/* ===== Header ===== */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-20">
        <div className="flex flex-row md:items-end justify-between gap-3 md:gap-8 border-b border-[#D1C7B7] pb-3 md:pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div className="min-w-0">
            <div className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.6em] text-[#984443] font-bold mb-1 md:mb-4 opacity-80">
              Dashboard
            </div>
            <h2 className="font-serif text-lg md:text-5xl font-medium tracking-tight text-[#111111]">
              盤面總覽
              <span className="hidden md:inline text-[0.5em] ml-4 opacity-20 font-sans tracking-widest uppercase">
                OPERATIONS DASHBOARD
              </span>
            </h2>
          </div>
          <div className="flex flex-col gap-1 md:gap-2 shrink-0 self-end items-end">
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-1.5 md:py-2.5 bg-white border border-[#984443]/30 text-[#984443] rounded-sm text-[0.75rem] uppercase tracking-widest shadow-sm ring-1 ring-[#984443]/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#984443] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#984443]"></span>
              </span>
              MQTT 穩定
            </div>
            <span className="text-[0.75rem] uppercase tracking-[0.3em] opacity-40 italic">
              {sensors.lastUpdate}
            </span>
          </div>
        </div>
      </div>

      {/* 核心指標卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-8 mb-6 md:mb-12">
        <div className="bg-[#111111] text-[#FAF9F6] p-3 md:p-8 rounded-sm shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-1 md:right-0 md:p-4 opacity-10 text-2xl md:text-6xl font-serif">
            ¥
          </div>
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold mb-2 md:mb-6 opacity-60">
            累計營收
          </h6>
          <div className="font-serif text-base md:text-4xl font-medium mb-1 md:mb-3 tracking-tighter break-all">
            ${currency(stats.totalRevenue)}
          </div>
          <div className="text-[0.75rem] md:text-[0.75rem] opacity-80 flex items-center gap-1 md:gap-2">
            <span className="text-[#984443] font-bold">{stats.paidCount}</span>
            <span>筆已付款</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-8 rounded-sm shadow-sm border border-[#D1C7B7] relative group hover:border-[#111111] transition-kyoto">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-[#111111] opacity-40 mb-2 md:mb-6">
            倉儲環境
          </h6>
          <div className="font-serif text-base md:text-3xl font-medium text-[#111111] mb-1 md:mb-3">
            {sensors.tempA}°
            <span className="text-[0.75rem] md:text-sm opacity-40 ml-0.5">
              C
            </span>{' '}
            / {sensors.humidityA}
            <span className="text-[0.75rem] md:text-sm opacity-40 ml-0.5">
              %
            </span>
          </div>
          <div
            className={`text-[0.75rem] md:text-[0.75rem] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] ${sensors.humidityA > 60 ? 'text-[#984443]' : 'text-[#3A4D39]'}`}
          >
            {sensors.humidityA > 60 ? '⚠ Warning' : '◯ Optimal'}
          </div>
        </div>

        <div className="bg-white p-3 md:p-8 rounded-sm shadow-sm border border-[#D1C7B7] hover:border-[#111111] transition-kyoto">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-[#111111] opacity-40 mb-2 md:mb-6">
            平均客單價
          </h6>
          <div className="font-serif text-base md:text-3xl font-medium text-[#111111] mb-1 md:mb-3 break-all">
            ${currency(stats.avgOrderValue)}
          </div>
          <div className="text-[0.75rem] md:text-[0.75rem] opacity-30 italic tracking-wider">
            {stats.paidCount} paid
          </div>
        </div>

        <div className="bg-white p-3 md:p-8 rounded-sm shadow-sm border border-[#D1C7B7] hover:border-[#111111] transition-kyoto">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-[#111111] opacity-40 mb-2 md:mb-6">
            付款轉換率
          </h6>
          <div className="font-serif text-base md:text-3xl font-medium text-[#735C00] mb-1 md:mb-3">
            {stats.paidRate}
            <span className="text-xs md:text-base opacity-50 ml-0.5">%</span>
          </div>
          <div className="text-[0.75rem] md:text-[0.75rem] opacity-30 italic tracking-wider">
            {stats.paidCount}/{stats.orderCount}
          </div>
        </div>
      </div>

      {/* 圖表分佈 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-10 mb-6 md:mb-12">
        <div className="lg:col-span-8 bg-white p-3 md:p-10 rounded-sm shadow-sm border border-[#D1C7B7]">
          <div className="flex items-center justify-between mb-3 md:mb-10 flex-wrap gap-2">
            <h5 className="font-serif text-base md:text-2xl font-medium flex items-center gap-2 md:gap-4 flex-wrap">
              月度銷售趨勢
              <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-30 font-sans mt-1">
                Last 6 Months
              </span>
            </h5>
          </div>
          <div className="h-[200px] md:h-[300px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.revenueTrend}
                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="colorTY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111111" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: '#111111',
                    opacity: 0.4,
                    fontSize: 10,
                    letterSpacing: '1px',
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tick={{ fill: '#111111', opacity: 0.4, fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v) => `$${currency(v)}`}
                  contentStyle={{
                    backgroundColor: '#FAF9F6',
                    border: '1px solid #D1C7B7',
                    borderRadius: '0px',
                    boxShadow: 'none',
                  }}
                  itemStyle={{ fontFamily: 'Noto Serif JP', fontSize: '13px' }}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  height={28}
                  iconType="rect"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  name="今年"
                  dataKey="thisYear"
                  stroke="#111111"
                  fill="url(#colorTY)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="去年同期"
                  dataKey="lastYear"
                  stroke="#D1C7B7"
                  fill="transparent"
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-3 md:p-10 rounded-sm shadow-sm border border-[#D1C7B7]">
          <h5 className="font-serif text-base md:text-2xl font-medium mb-3 md:mb-10">
            熱門商域
          </h5>
          {stats.fragranceData.length > 0 ? (
            <>
              {/* Mobile: pie + list side by side */}
              <div className="md:hidden flex flex-row items-center gap-2">
                <div className="w-1/2 h-[140px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.fragranceData}
                        innerRadius="48%"
                        outerRadius="78%"
                        paddingAngle={4}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                      >
                        {stats.fragranceData.map((entry, index) => (
                          <Cell
                            key={`cell-m-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FAF9F6',
                          border: '1px solid #D1C7B7',
                          borderRadius: '0px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-1/2 space-y-2 text-[0.75rem]">
                  {stats.fragranceData.map((entry, index) => (
                    <li
                      key={`m-${entry.name}`}
                      className="flex items-start gap-2 min-w-0"
                    >
                      <span
                        className="shrink-0 w-2 h-2 rounded-full mt-1"
                        style={{
                          background: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      ></span>
                      <div className="min-w-0 flex-1">
                        <div className="font-serif text-[#111111] truncate">
                          {entry.name}
                        </div>
                        <div className="opacity-40 font-mono text-[0.75rem]">
                          × {entry.value}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Desktop: pie on top, legend below inside card */}
              <div className="hidden md:flex md:flex-col md:gap-6">
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.fragranceData}
                        innerRadius="48%"
                        outerRadius="78%"
                        paddingAngle={4}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                      >
                        {stats.fragranceData.map((entry, index) => (
                          <Cell
                            key={`cell-d-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FAF9F6',
                          border: '1px solid #D1C7B7',
                          borderRadius: '0px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {stats.fragranceData.map((entry, index) => (
                    <li
                      key={`d-${entry.name}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <span
                        className="shrink-0 w-3 h-3 rounded-full"
                        style={{
                          background: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      ></span>
                      <span className="font-serif text-[#111111] flex-1 truncate">
                        {entry.name}
                      </span>
                      <span className="opacity-40 font-mono text-xs shrink-0">
                        ×{entry.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="h-[140px] md:h-[260px] w-full flex items-center justify-center text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] opacity-30">
              {dataReady ? '尚無已付款訂單資料' : '載入中…'}
            </div>
          )}
        </div>
      </div>

      {/* 底部模組: 待辦與終端日誌 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-10">
        <div className="bg-white p-3 md:p-10 rounded-sm shadow-sm border border-[#D1C7B7]">
          <h5 className="font-serif text-base md:text-2xl font-medium mb-3 md:mb-8 border-b border-[#D1C7B7] pb-3 md:pb-4 flex items-center justify-between gap-4">
            <span>待辦事項</span>
            <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-30 font-sans">
              {priorityTasks.length} items
            </span>
          </h5>
          <div className="divide-y divide-[#D1C7B7]/30">
            {priorityTasks.length === 0 && (
              <div className="py-8 text-center text-[0.75rem] uppercase tracking-[0.3em] opacity-30">
                {dataReady ? '目前無待辦事項' : '載入中…'}
              </div>
            )}
            {priorityTasks.map((task) => (
              <div
                key={task.id}
                className="py-4 md:py-5 flex justify-between items-center gap-4 group cursor-pointer hover:pl-2 transition-all duration-500"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-[#111111] group-hover:text-[#984443] transition-colors truncate">
                    {task.issue}
                  </div>
                  <small className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] text-[#111111]/40">
                    {task.kind === 'agent' ? 'AGENT' : 'INVENTORY'} • {task.id}{' '}
                    • {task.date}
                  </small>
                </div>
                <span
                  className={`shrink-0 px-3 md:px-4 py-1 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] font-bold border ${
                    task.level === 'High'
                      ? 'border-[#984443] text-[#984443]'
                      : task.level === 'Medium'
                        ? 'border-[#735C00] text-[#735C00]'
                        : 'border-[#3A4D39] text-[#3A4D39]'
                  }`}
                >
                  {task.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111111] p-3 md:p-10 rounded-sm shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#984443]/40 to-transparent"></div>
          <h5 className="font-serif text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.5em] text-[#FAF9F6] opacity-30 mb-3 md:mb-8 border-l border-[#984443] pl-3 md:pl-4">
            Terminal Live Log • MQTT
          </h5>
          <div className="font-mono text-[0.75rem] md:text-[0.75rem] text-[#3A4D39] leading-relaxed flex-grow overflow-auto break-all">
            <div className="mb-2 opacity-60">
              [{sensors.lastUpdate}] Topic: sensors/zone_a/temp - Received:{' '}
              {sensors.tempA}°C
            </div>
            <div className="mb-2 opacity-60">
              [{sensors.lastUpdate}] Topic: sensors/zone_a/hum - Received:{' '}
              {sensors.humidityA}%
            </div>
            {sensors.humidityA > 60 && (
              <div className="text-[#984443] font-bold mb-2 animate-pulse">
                [ !! ] ALERT: Zone A Humidity threshold exceeded! Immediate
                dehydration protocol recommended.
              </div>
            )}
            <div className="text-white/20 mt-6 italic pl-4 border-l border-white/10">
              Handshaking with IoT Gateway [v2.4.1]...
            </div>
            <div className="text-white/20 pl-4">
              Node-08: Signal Strength -72dBm (Fair)
            </div>
            <div className="text-white/20 pl-4 border-b border-white/5 pb-2 mb-2">
              Node-09: Signal Strength -45dBm (Excellent)
            </div>
            <div className="text-[#735C00] opacity-80 animate-pulse mt-4">
              &gt;&gt; Awaiting packet from Warehouse B...
            </div>
          </div>
          <div className="mt-6 md:mt-8 flex justify-end">
            <div className="w-16 h-[1px] bg-[#FAF9F6]/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
