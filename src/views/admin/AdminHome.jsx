import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';
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

import { formatTwd } from '../../assets/utils/filter';
import useIsBelowLg from '../../hooks/useIsBelowLg';
import { getAdminOrders } from '../../service/adminOrders';
import { getAdminProducts } from '../../service/adminProducts';

const LOW_STOCK_THRESHOLD = 10;
const PIE_COLORS = ['#09256f', '#ff5a1f', '#147d67', '#a26a00'];

// orders.products 在 HexSchool API 有時是 array、有時是 object map，統一成 array
const toItemArray = (products) =>
  Array.isArray(products) ? products : Object.values(products || {});

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
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const isBelowLg = useIsBelowLg();

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

  useEffect(() => {
    let cancelled = false;
    setDataReady(false);
    setLoadError('');
    Promise.all([getAdminProducts(1), getAdminOrders(1)]).then(([p, o]) => {
      if (cancelled) return;
      if (p.data?.success === false || o.data?.success === false) throw new Error('讀取失敗');
      setProducts(Array.isArray(p.data.products) ? p.data.products : Object.values(p.data.products || {}));
      setOrders(Array.isArray(o.data.orders) ? o.data.orders : Object.values(o.data.orders || {}));
      setDataReady(true);
    }).catch(() => { if (!cancelled) setLoadError('總覽資料載入失敗，請重新載入。'); });
    return () => { cancelled = true; };
  }, [retry]);

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

    // 熱門商品：依商品 qty 在已付款訂單中加總
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

  const priorityTasks = useMemo(() => {
    const tasks = orders.filter(order => !order.is_paid).slice(0, 2).map(order => ({
      id: order.id, issue: '待確認付款：' + (order.user?.name || '未填姓名'),
      level: 'Medium', date: '待處理', kind: 'order',
    }));
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
  }, [orders, stats.lowStock]);

  return (
    <div className="enso-page">
      {loadError && <div className="workspace-error" role="alert">{loadError}<button className="enso-button-secondary" onClick={() => setRetry(value => value + 1)}>重新載入</button></div>}
      {/* ===== Header ===== */}
      <header className="enso-page-header"><div><h1 className="enso-page-title">營運總覽</h1><p className="enso-page-description">依 API 第一頁資料計算，非全部歷史營收。查看近期訂單與補貨提醒。</p></div><span className="enso-status enso-status--muted">感測器為模擬資料</span></header>

      {/* 核心指標卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-8 mb-6 md:mb-12">
        <div className="bg-[#09256f] text-[#fffaf6] p-3 md:p-8 rounded-sm shadow-none relative overflow-hidden group">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-bold mb-2 md:mb-6 opacity-80">
            本頁已付款營收
          </h6>
          <div className="font-sans text-base md:text-4xl font-medium mb-1 md:mb-3 tracking-tighter break-all">
            {formatTwd(stats.totalRevenue)}
          </div>
          <div className="text-[0.75rem] md:text-[0.75rem] opacity-80 flex items-center gap-1 md:gap-2">
            <span className="text-[#ba3e2a] font-bold">{stats.paidCount}</span>
            <span>筆已付款</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-8 rounded-sm shadow-none border border-[#b6bfd0] relative group hover:border-[#09256f] transition-enso">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-bold text-[#09256f] opacity-80 mb-2 md:mb-6">
            倉儲環境
          </h6>
          <div className="font-sans text-base md:text-3xl font-medium text-[#09256f] mb-1 md:mb-3">
            {sensors.tempA}°
            <span className="text-[0.75rem] md:text-sm opacity-80 ml-0.5">
              C
            </span>{' '}
            / {sensors.humidityA}
            <span className="text-[0.75rem] md:text-sm opacity-80 ml-0.5">
              %
            </span>
          </div>
          <div
            className={`text-[0.75rem] md:text-[0.75rem] font-bold uppercase tracking-[0.15em] md:tracking-normal ${sensors.humidityA > 60 ? 'text-[#ba3e2a]' : 'text-[#14624f]'}`}
          >
            {sensors.humidityA > 60 ? '注意：濕度偏高' : '正常：環境穩定'}
          </div>
        </div>

        <div className="bg-white p-3 md:p-8 rounded-sm shadow-none border border-[#b6bfd0] hover:border-[#09256f] transition-enso">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-bold text-[#09256f] opacity-80 mb-2 md:mb-6">
            平均客單價
          </h6>
          <div className="font-sans text-base md:text-3xl font-medium text-[#09256f] mb-1 md:mb-3 break-all">
            {formatTwd(stats.avgOrderValue)}
          </div>
          <div className="text-[0.75rem] md:text-[0.75rem] opacity-80 not-italic tracking-wider">
            {stats.paidCount} paid
          </div>
        </div>

        <div className="bg-white p-3 md:p-8 rounded-sm shadow-none border border-[#b6bfd0] hover:border-[#09256f] transition-enso">
          <h6 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-bold text-[#09256f] opacity-80 mb-2 md:mb-6">
            本頁已付款比例
          </h6>
          <div className="font-sans text-base md:text-3xl font-medium text-[#805500] mb-1 md:mb-3">
            {stats.paidRate}
            <span className="text-xs md:text-base opacity-80 ml-0.5">%</span>
          </div>
          <div className="text-[0.75rem] md:text-[0.75rem] opacity-80 not-italic tracking-wider">
            {stats.paidCount}/{stats.orderCount}
          </div>
        </div>
      </div>

      {/* 圖表分佈 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-10 mb-6 md:mb-12">
        <div className="lg:col-span-8 bg-white p-3 md:p-6 rounded-sm shadow-none border border-[#b6bfd0]">
          <div className="flex items-center justify-between mb-3 md:mb-10 flex-wrap gap-2">
            <h5 className="font-sans text-base md:text-2xl font-medium flex items-center gap-2 md:gap-4 flex-wrap">
              月度銷售趨勢（NT$）
              <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal opacity-80 font-sans mt-1">
                最近六個月
              </span>
            </h5>
          </div>
          <div className="h-[200px] md:h-[300px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.revenueTrend}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="colorTY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#09256f" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#09256f" stopOpacity={0} />
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
                    fill: '#09256f',
                    fontSize: 12,
                    letterSpacing: '1px',
                  }}
                  hide={isBelowLg}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                  tick={{ fill: '#09256f', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(v) => formatTwd(v)}
                  contentStyle={{
                    backgroundColor: '#fffaf6',
                    border: '1px solid #b6bfd0',
                    borderRadius: '0px',
                    boxShadow: 'none',
                  }}
                  itemStyle={{ fontFamily: 'Noto Sans TC', fontSize: '13px' }}
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
                  stroke="#09256f"
                  fill="url(#colorTY)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="去年同期"
                  dataKey="lastYear"
                  stroke="#b6bfd0"
                  fill="transparent"
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-3 md:p-6 rounded-sm shadow-none border border-[#b6bfd0]">
          <h5 className="font-sans text-base md:text-2xl font-medium mb-3 md:mb-10">
            熱門商品
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
                          backgroundColor: '#fffaf6',
                          border: '1px solid #b6bfd0',
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
                        <div className="font-sans text-[#09256f] truncate">
                          {entry.name}
                        </div>
                        <div className="opacity-80 font-mono text-[0.75rem]">
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
                          backgroundColor: '#fffaf6',
                          border: '1px solid #b6bfd0',
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
                      <span className="font-sans text-[#09256f] flex-1 truncate">
                        {entry.name}
                      </span>
                      <span className="opacity-80 font-mono text-xs shrink-0">
                        ×{entry.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="h-[140px] md:h-[260px] w-full flex items-center justify-center text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal opacity-80">
              {dataReady ? '尚無已付款訂單資料' : '載入中…'}
            </div>
          )}
        </div>
      </div>

      {/* 底部模組: 待辦與終端日誌 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-10">
        <div className="bg-white p-3 md:p-6 rounded-sm shadow-none border border-[#b6bfd0]">
          <h5 className="font-sans text-base md:text-2xl font-medium mb-3 md:mb-8 border-b border-[#b6bfd0] pb-3 md:pb-4 flex items-center justify-between gap-4">
            <span>待辦事項</span>
            <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal opacity-80 font-sans">
              {priorityTasks.length} items
            </span>
          </h5>
          <div className="divide-y divide-[#b6bfd0]/30">
            {priorityTasks.length === 0 && (
              <div className="py-8 text-center text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal opacity-80">
                {dataReady ? '目前無待辦事項' : '載入中…'}
              </div>
            )}
            {priorityTasks.map((task) => (
              <div
                key={task.id}
                className="py-4 md:py-5 flex justify-between items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-[#09256f] truncate">
                    {task.issue}
                  </div>
                  <small className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal text-ink-muted">
                    {task.kind === 'order' ? '訂單' : '庫存'} • {task.id}{' '}
                    • {task.date}
                  </small>
                </div>
                <span
                  className={`shrink-0 px-3 md:px-4 py-1 text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal font-bold border ${
                    task.level === 'High'
                      ? 'border-[#ba3e2a] text-[#ba3e2a]'
                      : task.level === 'Medium'
                        ? 'border-[#805500] text-[#805500]'
                        : 'border-[#14624f] text-[#14624f]'
                  }`}
                >
                  {task.level === 'High' ? '優先處理' : '待處理'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <section className="enso-card">
          <h2 className="text-xl font-bold mb-4">倉儲環境示範</h2>
          <p className="workspace-hint">以下數值由前端模擬，每三秒更新，並未連接實體感測器或 MQTT 服務。</p>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt>區域 A 溫度</dt><dd className="text-2xl mt-2">{sensors.tempA}°C</dd></div>
            <div><dt>區域 A 濕度</dt><dd className="text-2xl mt-2">{sensors.humidityA}％</dd></div>
            <div><dt>區域 B 溫度</dt><dd className="text-2xl mt-2">{sensors.tempB}°C</dd></div>
            <div><dt>區域 B 濕度</dt><dd className="text-2xl mt-2">{sensors.humidityB}％</dd></div>
          </dl>
          <p className="workspace-hint">最近更新：{sensors.lastUpdate}</p>
          <Link className="workspace-link" to="/admin/devices">查看設備示範</Link>
        </section>
      </div>
    </div>
  );
};

export default AdminHome;
