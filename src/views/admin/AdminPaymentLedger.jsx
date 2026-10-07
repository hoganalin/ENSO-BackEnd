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
  getOrderPaymentMethod,
} from '../../utils/paymentMethods';

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
  const [loadWarning, setLoadWarning] = useState('');
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
        if (results.some(result => !result?.data?.success)) setLoadWarning('部分交易資料無法載入，以下只顯示成功取得的紀錄。可重新整理頁面再試。');
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
  }, []);

  // 僅顯示來源已提供付款方式的訂單，不替正式資料推測付款方式。
  const paidOrders = useMemo(
    () => orders.filter((o) => getOrderPaymentMethod(o)),
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
      <FullPageLoading isLoading={loading} />
      <div className="enso-page">
        {loadWarning && <p className="workspace-error" role="alert">{loadWarning}</p>}
        {/* ===== Header ===== */}
        <header className="enso-page-header"><div><h1 className="enso-page-title">金流紀錄</h1><p className="enso-page-description">彙整帶有付款方式的訂單資料。此頁為模擬金流，不代表實際收款或銀行對帳。</p></div></header>

        {/* 非 demo 帳號提示：有訂單但沒任何 paid_method（HexSchool 原生訂單沒帶 ECPay 欄位） */}
        {orders.length > 0 && paidOrders.length === 0 && (
          <div className="mb-8 rounded-xl border border-[#F59E0B]/50 bg-[#FEF3C7]/40 px-5 py-4 text-[0.85rem] text-[#805500]">
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
          <Panel title="付款方式分布">
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
                    stroke="#fffaf6"
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

          <Panel title="近 14 天成交金額（NT$）">
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
                      v >= 1000 ? `${Math.round(v / 1000)}k` : v
                    }
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === 'amount'
                        ? [`NT$ ${Number(v).toLocaleString()}`, '金額']
                        : [`${v} 筆`, '筆數']
                    }
                    labelStyle={{ color: '#09256f' }}
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
                    stroke="#ba3e2a"
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
        <Panel title="最近交易明細">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#b6bfd0]/40 text-[10px] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted">
                  <th className="px-4 py-4">時間</th>
                  <th className="px-4 py-4">訂單</th>
                  <th className="px-4 py-4">客戶</th>
                  <th className="px-4 py-4">付款方式</th>
                  <th className="px-4 py-4">交易編號</th>
                  <th className="px-4 py-4 text-right">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b6bfd0]/20">
                {paidOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-20 text-center text-ink-muted not-italic font-sans"
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
                        className="hover:bg-[#09256f]/[0.02] transition-colors"
                      >
                        <td className="px-4 py-4 text-[0.75rem] text-[#09256f]/70 whitespace-nowrap">
                          {formatShortDate(order.create_at)}
                        </td>
                        <td className="px-4 py-4 font-mono text-[0.75rem] opacity-80">
                          {String(order.id).slice(0, 8)}…
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-sans">
                            {order.user?.name || '—'}
                          </div>
                          <div className="text-[0.75rem] opacity-80">
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
                        <td className="px-4 py-4 font-mono text-[0.75rem] opacity-80">
                          {order.user?.merchant_trade_no || '—'}
                        </td>
                        <td className="px-4 py-4 text-right font-sans font-medium">
                          <span className="text-[0.75rem] opacity-80 mr-1">
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
    <div className="bg-white border border-[#b6bfd0]/40 px-2 py-3 md:px-6 md:py-5">
      <div className="text-[12px] md:text-[0.75rem] uppercase tracking-[0.15em] md:tracking-normal text-ink-muted font-bold mb-1 md:mb-3">
        {label}
      </div>
      <div className="font-sans text-lg md:text-3xl whitespace-nowrap overflow-hidden text-ellipsis">
        {prefix && (
          <span className="text-[12px] md:text-sm opacity-80 mr-1">
            {prefix}
          </span>
        )}
        {displayValue}
        {suffix && (
          <span className="text-[12px] md:text-sm opacity-80 ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white border border-[#b6bfd0]/40 p-3 md:p-6">
      <header className="mb-5 pb-3 border-b border-[#b6bfd0]/30">
        <h3 className="font-sans text-xl text-[#09256f]">{title}</h3>
      </header>
      {children}
    </section>
  );
}

function EmptyHint() {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <div className="text-center text-ink-muted font-sans not-italic">
        <div className="w-12 h-[1px] bg-[#ba3e2a]/30 mx-auto mb-3"></div>
        尚無資料
        <div className="w-12 h-[1px] bg-[#ba3e2a]/30 mx-auto mt-3"></div>
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
