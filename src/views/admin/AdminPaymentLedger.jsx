import { useEffect, useMemo, useState } from 'react';

import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import FullPageLoading from '../../components/FullPageLoading';
import useIsBelowLg from '../../hooks/useIsBelowLg';
import useMessage from '../../hooks/useMessage';
import { getAdminOrders } from '../../service/adminOrders';
import {
  PAYMENT_CATEGORIES,
  PAYMENT_METHODS,
  getOrderPaymentMethod,
} from '../../utils/paymentMethods';

// 真實 HexSchool 帳號的訂單沒有 paid_method 欄位，這裡用 order.id hash
// 對應到 12 種付款方式之一，讓 PaymentLedger 在正式登入也能展示完整圖表。
// 確定性 (deterministic)：同一筆訂單每次都對應到同一種付款方式，不會跳動。
const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS);
function hashToIndex(str, n) {
  let h = 0;
  for (let i = 0; i < String(str).length; i += 1) {
    h = (h * 31 + String(str).charCodeAt(i)) >>> 0;
  }
  return h % n;
}
function ensurePaidMethod(order) {
  if (order?.user?.paid_method) return order;
  const idx = hashToIndex(order?.id ?? '', PAYMENT_METHOD_KEYS.length);
  const key = PAYMENT_METHOD_KEYS[idx];
  const m = PAYMENT_METHODS[key];
  return {
    ...order,
    user: {
      ...(order?.user || {}),
      paid_method: key,
      paid_method_label: m.label,
      paid_category: m.category,
    },
  };
}

/**
 * 金流台帳（Payment Ledger）
 *
 * 把所有訂單的 paid_method 聚合起來做三件事：
 *   1. Pie chart：近期付款方式分布
 *   2. Line chart：近 14 天成交金額趨勢
 *   3. Table：最近 20 筆交易明細
 *
 * 資料來源：直接用現有 getAdminOrders 抓最多 10 頁。HexSchool 一頁 10 筆，
 * 取 10 頁 ≈ 最新 100 筆訂單，足夠 demo 用。
 */

// Recharts pie 要顏色：對應 PAYMENT_CATEGORIES 的 category 色票
const CATEGORY_FILL = {
  card: '#10B981', // emerald-500
  wallet: '#A855F7', // purple-500
  transfer: '#0EA5E9', // sky-500
  cvs: '#F59E0B', // amber-500
  qr: '#F43F5E', // rose-500
  unknown: '#9CA3AF', // gray-400
};

const PAGES_TO_FETCH = 10;

function AdminPaymentLedger() {
  const { showError } = useMessage();
  const [orders, setOrders] = useState([]);
  const [loading, setIsLoading] = useState(false);
  const isBelowLg = useIsBelowLg();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        // 平行抓最多 10 頁訂單
        const promises = Array.from({ length: PAGES_TO_FETCH }, (_, i) =>
          getAdminOrders(i + 1).catch(() => null)
        );
        const results = await Promise.all(promises);
        if (cancelled) return;
        const merged = results
          .filter((r) => r?.data?.success)
          .flatMap((r) => {
            const raw = r.data.orders;
            return Array.isArray(raw) ? raw : Object.values(raw || {});
          });
        // 以 id 去重，並按 create_at 新→舊排序
        const unique = Array.from(
          new Map(merged.map((o) => [o.id, o])).values()
        ).sort((a, b) => (b.create_at || 0) - (a.create_at || 0));
        setOrders(unique);
      } catch (err) {
        if (!cancelled)
          showError(err?.response?.data?.message || '載入交易紀錄失敗');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 真實帳號的訂單沒有 paid_method 也合成一筆，PaymentLedger 在正式登入也能完整展示
  const paidOrders = useMemo(
    () => orders.map(ensurePaidMethod).filter((o) => getOrderPaymentMethod(o)),
    [orders]
  );

  // Pie：按付款方式聚合
  const pieData = useMemo(() => {
    const byMethod = new Map();
    for (const o of paidOrders) {
      const m = getOrderPaymentMethod(o);
      const key = m.label;
      const prev = byMethod.get(key) || {
        name: key,
        value: 0,
        category: m.category,
      };
      prev.value += 1;
      byMethod.set(key, prev);
    }
    return Array.from(byMethod.values()).sort((a, b) => b.value - a.value);
  }, [paidOrders]);

  // Pie：按 category 聚合（做 inner ring）
  const categoryData = useMemo(() => {
    const byCat = new Map();
    for (const o of paidOrders) {
      const m = getOrderPaymentMethod(o);
      const prev = byCat.get(m.category) || {
        name: PAYMENT_CATEGORIES[m.category]?.label ?? m.category,
        value: 0,
        category: m.category,
      };
      prev.value += 1;
      byCat.set(m.category, prev);
    }
    return Array.from(byCat.values());
  }, [paidOrders]);

  // Line chart：近 14 天每日成交金額
  const trendData = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const buckets = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * dayMs);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      buckets.push({ day: label, ts: d.getTime(), amount: 0, count: 0 });
    }
    const bucketMap = new Map(buckets.map((b) => [b.ts, b]));
    for (const o of paidOrders) {
      if (!o.create_at) continue;
      const d = new Date(o.create_at * 1000);
      const key = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      ).getTime();
      const b = bucketMap.get(key);
      if (!b) continue;
      b.amount += o.total || 0;
      b.count += 1;
    }
    return buckets;
  }, [paidOrders]);

  const kpi = useMemo(() => {
    const totalAmount = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avg =
      paidOrders.length > 0 ? Math.round(totalAmount / paidOrders.length) : 0;
    return {
      count: paidOrders.length,
      totalAmount,
      avg,
    };
  }, [paidOrders]);

  return (
    <>
      {loading && <FullPageLoading />}
      <div className="min-h-screen bg-[#FAF9F6] max-w-7xl mx-auto px-3 py-3 md:px-6 md:py-12 font-sans text-[#111111]">
        {/* ===== Header ===== */}
        <div className="mb-6 md:mb-20">
          <div className="flex flex-row md:items-end justify-between gap-3 md:gap-8 border-b border-[#D1C7B7] pb-3 md:pb-10 relative">
            <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
            <div className="min-w-0">
              <div className="text-[0.75rem] uppercase tracking-[0.1em] md:tracking-[0.6em] text-[#984443] font-bold mb-1 md:mb-4 opacity-80">
                Payment Ledger
              </div>
              <h1 className="font-serif text-lg md:text-5xl font-medium tracking-tight text-[#111111]">
                金流台帳
                <span className="hidden md:inline text-[0.5em] ml-4 opacity-20 font-sans tracking-wider md:tracking-widest uppercase">
                  ECPAY AGGREGATION
                </span>
              </h1>
            </div>
          </div>
          <p className="text-[12px] md:text-[13px] text-[#111111]/50 mt-3 md:mt-4 max-w-xl italic">
            來自 ECPay 模擬金流的交易紀錄。聚合近期所有帶有 paid_method
            的訂單，給你按付款方式與時間維度的 funnel 視野。
          </p>
        </div>

        {/* 非 demo 帳號提示：有訂單但沒任何 paid_method（HexSchool 原生訂單沒帶 ECPay 欄位） */}
        {orders.length > 0 && paidOrders.length === 0 && (
          <div className="mb-8 px-5 py-4 bg-[#FEF3C7]/40 border-l-4 border-[#F59E0B] text-[0.85rem] text-[#735C00]">
            <strong className="font-bold">本頁需要 ECPay 模擬資料：</strong>
            目前載入的 {orders.length} 筆訂單沒有{' '}
            <code className="px-1 bg-white/60">paid_method</code> 欄位（屬於
            HexSchool 原生訂單）。請使用 demo
            帳號登入查看完整金流台帳，或從前台走完一次模擬綠界結帳流程。
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6 md:mb-12">
          <KpiCard label="模擬交易筆數" value={kpi.count} suffix="筆" />
          <KpiCard
            label="累計交易金額"
            value={kpi.totalAmount}
            prefix="NT$"
            format="comma"
          />
          <KpiCard
            label="平均客單價"
            value={kpi.avg}
            prefix="NT$"
            format="comma"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-8 mb-6 md:mb-12">
          <Panel title="付款方式分布" subtitle="Payment Method Distribution">
            {pieData.length === 0 ? (
              <EmptyHint />
            ) : (
              <ResponsiveContainer width="100%" height={isBelowLg ? 240 : 320}>
                <PieChart>
                  {/* 內圈：按 category 分色 */}
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={isBelowLg ? 36 : 60}
                    stroke="none"
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={
                          CATEGORY_FILL[entry.category] ?? CATEGORY_FILL.unknown
                        }
                        fillOpacity={0.35}
                      />
                    ))}
                  </Pie>
                  {/* 外圈：按個別 method */}
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={isBelowLg ? 44 : 72}
                    outerRadius={isBelowLg ? 70 : 120}
                    stroke="#FAF9F6"
                    strokeWidth={2}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          CATEGORY_FILL[entry.category] ?? CATEGORY_FILL.unknown
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} 筆`, '交易數']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="近 14 天成交金額" subtitle="14-day Revenue Trend">
            {trendData.every((b) => b.amount === 0) ? (
              <EmptyHint />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={trendData}
                  margin={{ top: 20, right: 20, bottom: 10, left: 20 }}
                >
                  <XAxis
                    dataKey="day"
                    stroke="#6B7280"
                    fontSize={12}
                    hide={isBelowLg}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(v) =>
                      `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`
                    }
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === 'amount'
                        ? [`NT$ ${Number(v).toLocaleString()}`, '金額']
                        : [`${v} 筆`, '筆數']
                    }
                    labelStyle={{ color: '#111111' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="金額"
                    stroke="#00693E"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="筆數"
                    stroke="#984443"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    yAxisId="count"
                  />
                  <YAxis yAxisId="count" orientation="right" hide />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* Recent transactions table */}
        <Panel title="最近交易明細" subtitle="Recent Transactions">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#D1C7B7]/40 text-[10px] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-[0.3em] font-bold text-[#111111]/50">
                  <th className="px-4 py-4">時間</th>
                  <th className="px-4 py-4">訂單</th>
                  <th className="px-4 py-4">客戶</th>
                  <th className="px-4 py-4">付款方式</th>
                  <th className="px-4 py-4">交易編號</th>
                  <th className="px-4 py-4 text-right">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1C7B7]/20">
                {paidOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-20 text-center text-[#111111]/30 italic font-serif"
                    >
                      目前還沒有交易紀錄。到前台下一筆試試 →
                    </td>
                  </tr>
                ) : (
                  paidOrders.slice(0, 20).map((order) => {
                    const pm = getOrderPaymentMethod(order);
                    const catColor =
                      PAYMENT_CATEGORIES[pm.category]?.colorClass ?? '';
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#111111]/[0.02] transition-colors"
                      >
                        <td className="px-4 py-4 text-[0.75rem] text-[#111111]/70 whitespace-nowrap">
                          {formatShortDate(order.create_at)}
                        </td>
                        <td className="px-4 py-4 font-mono text-[0.75rem] opacity-60">
                          {String(order.id).slice(0, 8)}…
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-serif">
                            {order.user?.name || '—'}
                          </div>
                          <div className="text-[0.75rem] opacity-40">
                            {order.user?.email}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.75rem] font-bold rounded border ${catColor}`}
                          >
                            <i className={`bi ${pm.icon}`}></i>
                            {pm.shortLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-[0.75rem] opacity-60">
                          {order.user?.merchant_trade_no || '—'}
                        </td>
                        <td className="px-4 py-4 text-right font-serif font-medium">
                          <span className="text-[0.75rem] opacity-40 mr-1">
                            NT$
                          </span>
                          {Number(order.total || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

function KpiCard({ label, value, suffix, prefix, format }) {
  const displayValue =
    format === 'comma' ? Number(value || 0).toLocaleString() : value;
  return (
    <div className="bg-white border border-[#D1C7B7]/40 px-2 py-3 md:px-6 md:py-5">
      <div className="text-[12px] md:text-[0.75rem] uppercase tracking-[0.15em] md:tracking-[0.3em] text-[#111111]/40 font-bold mb-1 md:mb-3">
        {label}
      </div>
      <div className="font-serif text-lg md:text-3xl whitespace-nowrap overflow-hidden text-ellipsis">
        {prefix && (
          <span className="text-[12px] md:text-sm opacity-50 mr-1">
            {prefix}
          </span>
        )}
        {displayValue}
        {suffix && (
          <span className="text-[12px] md:text-sm opacity-50 ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="bg-white border border-[#D1C7B7]/40 p-3 md:p-6">
      <header className="mb-5 pb-3 border-b border-[#D1C7B7]/30">
        <div className="text-[0.75rem] uppercase tracking-[0.1em] md:tracking-[0.3em] text-[#984443] font-bold mb-1">
          {subtitle}
        </div>
        <h3 className="font-serif text-xl text-[#111111]">{title}</h3>
      </header>
      {children}
    </section>
  );
}

function EmptyHint() {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <div className="text-center text-[#111111]/30 font-serif italic">
        <div className="w-12 h-[1px] bg-[#984443]/30 mx-auto mb-3"></div>
        尚無資料
        <div className="w-12 h-[1px] bg-[#984443]/30 mx-auto mt-3"></div>
      </div>
    </div>
  );
}

function formatShortDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

export default AdminPaymentLedger;
