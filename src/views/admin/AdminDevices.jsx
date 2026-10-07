import { useState } from 'react';

import Dialog from '../../components/admin/Dialog';

const DEVICE_OVERRIDES_KEY = 'enso_device_overrides';

// 沒有真實 IoT 後端 — 把 ConfigModal 儲存的閾值/間隔寫進 localStorage，
// 重新整理仍會保留。這跟 AdminInventory 用 enso_inventory_logs 一樣，純前端持久化。
const loadOverrides = () => {
  try {
    const value = JSON.parse(localStorage.getItem(DEVICE_OVERRIDES_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

const saveOverride = (id, partial) => {
  const all = JSON.parse(localStorage.getItem(DEVICE_OVERRIDES_KEY) || '{}');
  if (!all || typeof all !== 'object' || Array.isArray(all)) throw new Error('本機設定格式不正確');
  all[id] = { ...(all[id] || {}), ...partial };
  localStorage.setItem(DEVICE_OVERRIDES_KEY, JSON.stringify(all));
};

// 模擬 7 / 30 / 90 天份的逐筆遙測，依 sensor 數 × 每日點數產生
const buildHistoryRows = (sensors, days) => {
  const rows = [];
  const now = Date.now();
  // 一日 8 點，避免 90 天 × 5 sensor × 96 點過大
  const pointsPerDay = 8;
  for (let d = days - 1; d >= 0; d -= 1) {
    for (let p = 0; p < pointsPerDay; p += 1) {
      const ts =
        now - d * 86400_000 - (pointsPerDay - p) * (86400_000 / pointsPerDay);
      sensors.forEach((s) => {
        if (s.status === 'Offline') return;
        const isTH = s.type === '溫溼度感測器';
        const temp = isTH
          ? +(22 + Math.sin((d + p) / 3) * 1.5 + Math.random() * 0.4).toFixed(1)
          : null;
        const humidity = isTH
          ? Math.round(48 + Math.cos((d + p) / 4) * 6 + Math.random() * 2)
          : null;
        const value = isTH ? `${temp}°C / ${humidity}%` : '正常 (Safe)';
        rows.push({
          timestamp: new Date(ts).toISOString(),
          sensor_id: s.id,
          sensor_type: s.type,
          location: s.location,
          temperature: temp ?? '',
          humidity: humidity ?? '',
          status: s.status,
          value,
        });
      });
    }
  }
  return rows;
};

const toCsv = (rows) => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) =>
    lines.push(headers.map((h) => escape(row[h])).join(','))
  );
  return lines.join('\n');
};

const downloadBlob = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const INITIAL_SENSORS = [
  {
    id: 'SEN-TH-A01',
    type: '溫溼度感測器',
    status: 'Online',
    battery: 92,
    lastValue: '22.5°C / 48%',
    location: 'A區 - 頂級沈香儲藏室',
    alertMin: 20,
    alertMax: 26,
    humidityMin: 40,
    humidityMax: 60,
    updateInterval: 5,
  },
  {
    id: 'SEN-TH-A02',
    type: '溫溼度感測器',
    status: 'Online',
    battery: 88,
    lastValue: '22.8°C / 50%',
    location: 'A區 - 老山檀香架',
    alertMin: 20,
    alertMax: 26,
    humidityMin: 40,
    humidityMax: 60,
    updateInterval: 5,
  },
  {
    id: 'SEN-SM-A01',
    type: '煙霧偵測器',
    status: 'Online',
    battery: 75,
    lastValue: '正常 (Safe)',
    location: 'A區 - 天花板中心',
    alertMin: null,
    alertMax: null,
    humidityMin: null,
    humidityMax: null,
    updateInterval: 1,
  },
  {
    id: 'SEN-TH-B01',
    type: '溫溼度感測器',
    status: 'Offline',
    battery: 0,
    lastValue: 'N/A',
    location: 'B區 - 原料乾燥室',
    alertMin: 20,
    alertMax: 28,
    humidityMin: 35,
    humidityMax: 65,
    updateInterval: 10,
  },
  {
    id: 'SEN-SM-B01',
    type: '煙霧偵測器',
    status: 'Online',
    battery: 95,
    lastValue: '正常 (Safe)',
    location: 'B區 - 物流裝箱區',
    alertMin: null,
    alertMax: null,
    humidityMin: null,
    humidityMax: null,
    updateInterval: 1,
  },
];

/* ───────── 歷史數據導出 Modal ───────── */
function ExportModal({ sensors, onClose }) {
  const [range, setRange] = useState('7');
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [exportedRowCount, setExportedRowCount] = useState(0);
  const [error, setError] = useState('');

  const handleExport = () => {
    setError('');
    setExporting(true);
    // 用 setTimeout 讓 UI 顯示「封裝中」狀態並在下一個 tick 產生檔案，避免阻塞動畫
    setTimeout(() => {
      try {
        const days = Number(range);
        const rows = buildHistoryRows(sensors, days);
        const stamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        if (format === 'json') {
          downloadBlob(
            JSON.stringify(rows, null, 2),
            `enso-devices-${days}d-${stamp}.json`,
            'application/json;charset=utf-8'
          );
        } else if (format === 'tsv') {
          // TSV with BOM — Excel 雙擊能正確顯示中文
          const headers = Object.keys(
            rows[0] || { timestamp: '', sensor_id: '' }
          );
          const tsv =
            '﻿' +
            [headers.join('\t')]
              .concat(
                rows.map((r) =>
                  headers.map((h) => String(r[h] ?? '')).join('\t')
                )
              )
              .join('\n');
          downloadBlob(
            tsv,
            `enso-devices-${days}d-${stamp}.tsv`,
            'text/tab-separated-values;charset=utf-8'
          );
        } else {
          // csv default — 加上 BOM 避免 Excel 中文亂碼
          downloadBlob(
            '﻿' + toCsv(rows),
            `enso-devices-${days}d-${stamp}.csv`,
            'text/csv;charset=utf-8'
          );
        }
        setExportedRowCount(rows.length);
        setDone(true);
      } catch {
        setError('示範資料匯出失敗，請確認瀏覽器允許下載後重試。');
      } finally {
        setExporting(false);
      }
    }, 600);
  };

  return (
    <ModalWrapper onClose={onClose} title="匯出示範資料" busy={exporting}>
      {error && <p className="workspace-error" role="alert">{error}</p>}
      {done ? (
        <div className="text-center py-10 md:py-16 animate-in fade-in zoom-in duration-700">
          <h5 className="font-sans text-xl md:text-2xl font-medium text-[#09256f] mb-3 md:mb-4">
            示範資料已匯出
          </h5>
          <p className="text-xs md:text-sm opacity-80 font-sans not-italic mb-8 md:mb-12 px-2">
            最近 {range} 天 共 {exportedRowCount.toLocaleString()}{' '}
            筆模擬感測紀錄已產生下載檔案（{format.toUpperCase()}）。
          </p>
          <button
            className="px-10 md:px-12 py-3 bg-[#09256f] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black hover:bg-[#ba3e2a] transition-all duration-500"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section>
            <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black text-ink-muted block mb-3 md:mb-6">
              匯出期間
            </label>
            <div className="grid grid-cols-3 gap-px bg-[#b6bfd0]/20 border border-[#b6bfd0]/20">
              {[
                { v: '7', l: '七日' },
                { v: '30', l: '三十日' },
                { v: '90', l: '季報' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  aria-pressed={range === v}
                  disabled={exporting}
                  className={`py-3 md:py-4 text-[0.75rem] md:text-[0.75rem] font-black tracking-wider md:tracking-normal transition-all duration-500 ${
                    range === v
                      ? 'bg-[#09256f] text-white'
                      : 'bg-transparent text-ink-muted hover:bg-[#09256f]/5 hover:text-[#09256f]'
                  }`}
                  onClick={() => setRange(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black text-ink-muted block mb-3 md:mb-6">
              檔案格式
            </label>
            <div className="flex flex-wrap gap-4 md:gap-8">
              {['csv', 'json', 'tsv'].map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-2 md:gap-4 cursor-pointer group"
                >
                  <div className="relative">
                    <input
                      type="radio"
                      disabled={exporting}
                      className="sr-only peer"
                      name="format"
                      checked={format === f}
                      onChange={() => setFormat(f)}
                    />
                    <div className="w-5 h-5 border border-[#b6bfd0] peer-checked:border-[#09256f] peer-checked:bg-[#09256f] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 transition-all duration-500"></div>
                    <div className="absolute inset-1 bg-white scale-0 peer-checked:scale-100 transition-transform duration-500 origin-center"></div>
                  </div>
                  <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                    .{f}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className="p-4 md:p-6 bg-[#fffaf6] border-l border-[#ba3e2a] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.15em] md:tracking-normal font-bold opacity-80 not-italic">
              將匯出 {sensors.filter((s) => s.status === 'Online').length} 個
              在線設備的模擬資料
            </span>
            <span className="text-xs font-sans not-italic text-[#ba3e2a] shrink-0">
              {range} DAYS
            </span>
          </div>

          <div className="pt-4 md:pt-8 flex flex-col sm:flex-row sm:justify-end gap-3 md:gap-6 sm:items-center border-t border-[#b6bfd0]/10">
            <button
              className="px-4 py-3 sm:py-0 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted hover:text-[#09256f] transition-opacity order-2 sm:order-1"
              onClick={onClose}
              disabled={exporting}
            >
              取消
            </button>
            <button
              className="px-6 md:px-12 py-3 md:py-4 bg-[#09256f] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black hover:bg-[#ba3e2a] transition-all duration-700 disabled:opacity-20 order-1 sm:order-2"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? '正在產生檔案…' : '下載示範資料'}
            </button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

/* ───────── 感測器設定 Modal ───────── */
function ConfigModal({ sensor, onClose, onSave }) {
  const [form, setForm] = useState({
    alertMin: sensor.alertMin ?? 20,
    alertMax: sensor.alertMax ?? 26,
    humidityMin: sensor.humidityMin ?? 40,
    humidityMax: sensor.humidityMax ?? 60,
    updateInterval: sensor.updateInterval ?? 5,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handle = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value === '' ? '' : Number(e.target.value) }));

  const handleSave = () => {
    setError('');
    if (!Number.isInteger(form.updateInterval) || form.updateInterval < 1 || form.updateInterval > 30) {
      setError('回報間隔須為 1 至 30 分鐘的整數。');
      return;
    }
    if (!isSmoke && (
      ![form.alertMin, form.alertMax, form.humidityMin, form.humidityMax].every(Number.isFinite) ||
      form.alertMin > form.alertMax || form.humidityMin > form.humidityMax ||
      form.humidityMin < 0 || form.humidityMax > 100
    )) {
      setError('請填寫有效的上下限，下限不可大於上限，濕度須介於 0 至 100%。');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      try {
        onSave(sensor.id, form);
        setSaved(true);
      } catch {
        setError('設備設定未儲存。請確認瀏覽器儲存空間、權限或既有設定資料後重試。');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const isSmoke = sensor.type === '煙霧偵測器';

  return (
    <ModalWrapper onClose={onClose} title={`設備設定 — ${sensor.id}`} busy={saving}>
      {error && <p className="workspace-error" role="alert">{error}</p>}
      {saved ? (
        <div className="text-center py-10 md:py-16 animate-in fade-in zoom-in duration-700">
          <h5 className="font-sans text-xl md:text-2xl font-medium text-[#09256f] mb-3 md:mb-4">
            本機設定已儲存
          </h5>
          <p className="text-xs md:text-sm opacity-80 font-sans not-italic mb-8 md:mb-12 px-2 break-all">
            設備 {sensor.id} 的示範設定已保存在此瀏覽器，未同步至實體設備。
          </p>
          <button
            className="px-10 md:px-12 py-3 bg-[#09256f] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black hover:bg-[#ba3e2a] transition-all duration-500"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 md:p-8 bg-[#fffaf6] grid grid-cols-2 gap-4 md:gap-6 border border-[#b6bfd0]/20">
            <div>
              <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-black opacity-80 block mb-1 md:mb-2">
                設備位置
              </span>
              <span className="text-xs md:text-sm font-sans not-italic text-[#09256f] break-words">
                {sensor.location}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-black opacity-80 block mb-1 md:mb-2">
                設備類型
              </span>
              <span className="text-[0.75rem] md:text-xs font-bold uppercase tracking-wider md:tracking-normal text-[#09256f] break-words">
                {sensor.type}
              </span>
            </div>
          </div>

          {isSmoke ? (
            <div className="p-4 md:p-6 border-l border-[#ba3e2a] bg-[#fffaf6] not-italic text-xs leading-relaxed opacity-80">
              此示範煙霧偵測器僅能設定回報間隔，不會監控實際煙霧或觸發警報。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-10">
              <section className="space-y-3 md:space-y-4 min-w-0">
                <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black text-[#ba3e2a] block px-1">
                  溫度警戒線 (°C)
                </label>
                <div className="flex gap-2 md:gap-4 items-center">
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#b6bfd0] py-2 text-base md:text-lg font-sans focus:outline-none focus:border-[#09256f] transition-all"
                    value={form.alertMin}
                    aria-label="溫度下限（攝氏）"
                    disabled={saving}
                    onChange={handle('alertMin')}
                  />
                  <span className="opacity-80 text-[0.75rem] md:text-[0.75rem] shrink-0">
                    TO
                  </span>
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#b6bfd0] py-2 text-base md:text-lg font-sans focus:outline-none focus:border-[#09256f] transition-all"
                    value={form.alertMax}
                    aria-label="溫度上限（攝氏）"
                    disabled={saving}
                    onChange={handle('alertMax')}
                  />
                </div>
              </section>
              <section className="space-y-3 md:space-y-4 min-w-0">
                <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black text-ink-muted block px-1">
                  濕度警戒線 (%)
                </label>
                <div className="flex gap-2 md:gap-4 items-center">
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#b6bfd0] py-2 text-base md:text-lg font-sans focus:outline-none focus:border-[#09256f] transition-all"
                    value={form.humidityMin}
                    aria-label="濕度下限（百分比）"
                    disabled={saving}
                    onChange={handle('humidityMin')}
                  />
                  <span className="opacity-80 text-[0.75rem] md:text-[0.75rem] shrink-0">
                    TO
                  </span>
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#b6bfd0] py-2 text-base md:text-lg font-sans focus:outline-none focus:border-[#09256f] transition-all"
                    value={form.humidityMax}
                    aria-label="濕度上限（百分比）"
                    disabled={saving}
                    onChange={handle('humidityMax')}
                  />
                </div>
              </section>
            </div>
          )}

          <section>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 mb-4 md:mb-6 px-1">
              <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black text-ink-muted">
                示範回報間隔
              </label>
              <span className="text-xs md:text-sm font-sans not-italic text-[#ba3e2a]">
                每 {form.updateInterval} 分鐘
              </span>
            </div>
            <div className="relative pt-2">
              <input
                type="range"
                aria-label="示範回報間隔（分鐘）"
                disabled={saving}
                className="w-full h-[1px] bg-[#b6bfd0] appearance-none cursor-pointer accent-[#09256f] relative z-10"
                min="1"
                max="30"
                step="1"
                value={form.updateInterval}
                onChange={handle('updateInterval')}
              />
              <div className="absolute top-[9px] left-0 w-full flex justify-between px-1 pointer-events-none">
                {[...Array(7)].map((_, i) => (
                  <span key={i} className="w-[1px] h-2 bg-[#b6bfd0]/40"></span>
                ))}
              </div>
            </div>
          </section>

          <div className="pt-4 md:pt-8 flex flex-col sm:flex-row sm:justify-end gap-3 md:gap-6 sm:items-center border-t border-[#b6bfd0]/10">
            <button
              className="px-4 py-3 sm:py-0 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted hover:text-[#09256f] transition-opacity order-2 sm:order-1"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button
              className="px-6 md:px-12 py-3 md:py-4 bg-[#09256f] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black hover:bg-[#ba3e2a] transition-all duration-700 disabled:opacity-20 order-1 sm:order-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '儲存中…' : '儲存本機設定'}
            </button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

/* ───────── 校準 Modal ───────── */
function CalibrateModal({ sensor, onClose }) {
  const [step, setStep] = useState(0); // 0=確認 1=校準中 2=完成

  const handleStart = () => {
    setStep(1);
    setTimeout(() => setStep(2), 2500);
  };

  const steps = ['確認', '模擬中', '完成'];

  return (
    <ModalWrapper onClose={onClose} title={`模擬設備校準 — ${sensor.id}`} busy={step === 1}>
      <div className="flex justify-between items-center mb-8 md:mb-16 relative">
        <div className="absolute top-[12px] left-0 w-full h-[1px] bg-[#b6bfd0]/20 z-0"></div>
        {steps.map((s, i) => (
          <div
            key={s}
            className="relative z-10 flex flex-col items-center bg-white px-2 md:px-4"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.75rem] font-bold transition-all duration-1000 ${
                i <= step
                  ? 'bg-[#ba3e2a] text-white shadow-lg shadow-[#ba3e2a]/20'
                  : 'bg-[#fffaf6] border border-[#b6bfd0]/40 text-ink-muted'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-[0.75rem] md:text-[0.75rem] mt-2 md:mt-3 tracking-[0.15em] md:tracking-normal font-black uppercase whitespace-nowrap ${i <= step ? 'text-[#09256f]' : 'opacity-10'}`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 animate-in fade-in duration-700">
        {step === 0 && (
          <div className="space-y-6 md:space-y-10">
            <div className="p-4 md:p-8 bg-[#fffaf6] border border-[#b6bfd0]/20 space-y-3 md:space-y-4">
              <div className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal text-[#ba3e2a] font-black not-italic">
                僅供流程展示
              </div>
              <ul className="space-y-2 md:space-y-3 text-xs font-sans not-italic opacity-80 leading-relaxed pl-4 list-disc marker:text-[#ba3e2a]">
                <li>此操作會播放約三秒的模擬校準流程。</li>
                <li>
                  不會暫停真實設備傳輸，也不會改寫任何硬體設定。
                </li>
                <li>畫面結果不可作為設備校驗或倉儲品質判定依據。</li>
              </ul>
            </div>
            <div className="grid grid-cols-1 border border-[#b6bfd0]/10 divide-y divide-[#b6bfd0]/10">
              <div className="flex justify-between items-center gap-3 p-3 md:p-6">
                <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-black opacity-80">
                  當前回傳測值
                </span>
                <span className="text-base md:text-xl font-sans text-[#09256f] text-right break-all">
                  {sensor.lastValue}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 p-3 md:p-6">
                <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-normal md:tracking-normal font-black opacity-80">
                  安置地點
                </span>
                <span className="text-xs md:text-sm font-sans not-italic text-[#09256f] text-right break-words">
                  {sensor.location}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 md:gap-6 pt-4 sm:items-center">
              <button
                className="px-4 py-3 sm:py-0 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted hover:text-[#09256f] transition-opacity order-2 sm:order-1"
                onClick={onClose}
              >
                取消
              </button>
              <button
                className="px-6 md:px-12 py-3 md:py-4 bg-[#09256f] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black hover:bg-[#ba3e2a] transition-all duration-700 disabled:opacity-20 order-1 sm:order-2"
                onClick={handleStart}
                disabled={sensor.status === 'Offline'}
              >
                {sensor.status === 'Offline'
                  ? '設備離線，無法模擬'
                  : '開始模擬校準'}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="text-center py-12 md:py-20 flex flex-col items-center">
            <div className="relative mb-8 md:mb-12">
              <div className="w-16 h-16 border border-[#b6bfd0]/30 rounded-full animate-ping opacity-80"></div>
              <div className="absolute inset-0 w-16 h-16 border-2 border-[#09256f] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h6 className="font-sans not-italic text-xl md:text-2xl text-[#09256f] mb-3 md:mb-4">
              模擬校準中...
            </h6>
            <p className="text-[0.75rem] md:text-xs opacity-80 font-black tracking-wider md:tracking-normal uppercase">
              Base alignment in progress.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-10 md:py-16 animate-in zoom-in fade-in duration-1000">
            <h5 className="font-sans text-2xl md:text-3xl font-medium text-[#09256f] mb-3 md:mb-4">
              模擬校準完成
            </h5>
            <p className="text-xs md:text-sm opacity-80 not-italic font-sans mb-8 md:mb-12 break-words px-2">
              設備 {sensor.id} 的展示流程已完成，實體設備未受影響。
            </p>
            <button
              className="px-10 md:px-16 py-3 md:py-4 bg-[#09256f] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-black hover:bg-[#ba3e2a] transition-colors"
              onClick={onClose}
            >
              完成
            </button>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

/* ───────── 通用 Modal 框架 ───────── */
function ModalWrapper({ title, onClose, children, busy = false }) { return <Dialog title={title} onClose={onClose} busy={busy}>{children}</Dialog>; }

/* ───────── 主元件 ───────── */
const AdminDevices = () => {
  const [sensors, setSensors] = useState(() => {
    const overrides = loadOverrides();
    return INITIAL_SENSORS.map((s) =>
      overrides[s.id] ? { ...s, ...overrides[s.id] } : s
    );
  });
  const [modal, setModal] = useState(null);

  const openExport = () => setModal({ type: 'export' });
  const openConfig = (sensor) => setModal({ type: 'config', sensor });
  const openCalibrate = (sensor) => setModal({ type: 'calibrate', sensor });
  const closeModal = () => setModal(null);

  const handleSaveConfig = (id, form) => {
    saveOverride(id, form);
    setSensors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...form } : s))
    );
  };

  return (
    <div className="enso-page">
      {modal?.type === 'export' && (
        <ExportModal sensors={sensors} onClose={closeModal} />
      )}
      {modal?.type === 'config' && (
        <ConfigModal
          sensor={modal.sensor}
          onClose={closeModal}
          onSave={handleSaveConfig}
        />
      )}
      {modal?.type === 'calibrate' && (
        <CalibrateModal sensor={modal.sensor} onClose={closeModal} />
      )}

      {/* Header Section */}
      <header className="enso-page-header"><div><h1 className="enso-page-title">設備監控</h1><p className="enso-page-description">展示用感測資料與本機設定，尚未連接實體 IoT 設備。</p></div><div className="flex flex-wrap gap-3"><button className="enso-button-secondary" onClick={openExport}>匯出資料</button><button className="enso-button-primary" onClick={() => openConfig(sensors[0])}>設定首台設備</button></div></header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-3 md:gap-6 mb-8 md:mb-8">
        {/* Mobile Card List */}
        <div className="md:hidden px-1 space-y-3">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className="border border-[#b6bfd0]/40 bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs tracking-tighter font-bold text-[#09256f] break-all">
                    {sensor.id}
                  </div>
                  <div className="text-[0.75rem] opacity-80 uppercase tracking-wider md:tracking-normal mt-1">
                    {sensor.type} · {sensor.location}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sensor.status === 'Online' ? 'bg-[#14624f]' : 'bg-[#ba3e2a] animate-pulse'}`}
                  ></span>
                  <span
                    className={`text-[0.75rem] uppercase tracking-[0.15em] font-bold ${sensor.status === 'Online' ? 'text-[#14624f]' : 'text-[#ba3e2a]'}`}
                  >
                    {sensor.status === 'Online' ? '連線中' : '離線'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#b6bfd0]/30">
                <div className="flex items-baseline gap-1">
                  <span className="text-[0.75rem] uppercase tracking-wider md:tracking-normal opacity-80">
                    測值
                  </span>
                  <span
                    className={`font-sans text-xl font-medium ${sensor.status === 'Offline' ? 'opacity-80' : 'text-[#09256f]'}`}
                  >
                    {sensor.lastValue}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                  <div className="flex-1 h-[2px] bg-[#b6bfd0]/30 overflow-hidden relative">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all duration-1000 ${sensor.battery < 20 ? 'bg-[#ba3e2a]' : 'bg-[#09256f]'}`}
                      style={{ width: `${sensor.battery}%` }}
                    />
                  </div>
                  <span className="text-[0.75rem] font-mono opacity-80">
                    {sensor.battery}%
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-4 text-[0.75rem]">
                <button
                  className="uppercase tracking-[0.15em] font-bold text-ink-muted hover:text-[#09256f]"
                  onClick={() => openCalibrate(sensor)}
                >
                  校準
                </button>
                <button
                  className="uppercase tracking-[0.15em] font-bold text-ink-muted hover:text-[#09256f]"
                  onClick={() => openConfig(sensor)}
                >
                  設定
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto px-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#b6bfd0]/30 text-[10px] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted">
                <th className="px-2 py-3 md:px-4 md:py-8">
                  節點辨識 / NODE ID
                </th>
                <th className="px-2 py-3 md:px-4 md:py-8">
                  安置區域 / LOCATION
                </th>
                <th className="px-2 py-3 md:px-4 md:py-8 text-center">
                  連線狀態 / STATUS
                </th>
                <th className="px-2 py-3 md:px-4 md:py-8">
                  回傳測值 / TELEMETRY
                </th>
                <th className="px-2 py-3 md:px-4 md:py-8">電池電量</th>
                <th className="px-2 py-3 md:px-4 md:py-8 text-right">
                  核定操作 / ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#b6bfd0]/10">
              {sensors.map((sensor) => (
                <tr
                  key={sensor.id}
                  className="hover:bg-[#09256f]/[0.02] transition-colors duration-500 group"
                >
                  <td className="px-2 py-3 md:px-4 md:py-10">
                    <div className="font-mono text-sm tracking-tighter font-bold text-[#09256f] group-hover:text-[#ba3e2a] transition-colors">
                      {sensor.id}
                    </div>
                    <div className="text-[0.75rem] opacity-80 uppercase tracking-wider md:tracking-normal mt-2">
                      {sensor.type}
                    </div>
                  </td>
                  <td className="px-2 py-3 md:px-4 md:py-10">
                    <div className="text-sm font-sans not-italic text-ink-muted">
                      {sensor.location}
                    </div>
                  </td>
                  <td className="px-2 py-3 md:px-4 md:py-10 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${sensor.status === 'Online' ? 'bg-[#14624f]' : 'bg-[#ba3e2a] animate-pulse'}`}
                      ></span>
                      <span
                        className={`text-[0.75rem] uppercase tracking-normal font-bold ${sensor.status === 'Online' ? 'text-[#14624f]' : 'text-[#ba3e2a]'}`}
                      >
                        {sensor.status === 'Online'
                          ? '連線中'
                          : 'Disconnected'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 md:px-4 md:py-10">
                    <span
                      className={`font-sans text-2xl font-medium tracking-tighter ${sensor.status === 'Offline' ? 'opacity-10' : 'text-[#09256f]'}`}
                    >
                      {sensor.lastValue}
                    </span>
                  </td>
                  <td className="px-2 py-3 md:px-4 md:py-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-[1px] bg-[#b6bfd0]/30 overflow-hidden relative">
                        <div
                          className={`absolute left-0 top-0 h-full transition-all duration-1000 ${sensor.battery < 20 ? 'bg-[#ba3e2a]' : 'bg-[#09256f]'}`}
                          style={{ width: `${sensor.battery}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono opacity-80">
                        {sensor.battery}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 md:px-4 md:py-10 text-right">
                    <div className="inline-flex gap-3 md:gap-8">
                      <button
                        className="text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted hover:text-[#09256f] transition-colors duration-300"
                        onClick={() => openCalibrate(sensor)}
                      >
                        校準 / CAL
                      </button>
                      <button
                        className="text-[0.75rem] uppercase tracking-[0.1em] md:tracking-normal font-bold text-ink-muted hover:text-[#09256f] transition-colors duration-300"
                        onClick={() => openConfig(sensor)}
                      >
                        設定 / SET
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Curator's Note Section - Editorial Style */}
        <section className="enso-card mt-8"><h2 className="text-lg font-bold">展示資料的使用範圍</h2><p className="workspace-hint">設備列表、校準及匯出歷史為模擬資料，總覽另以定時器更新示範值，兩者未經實體閘道器串接。設定只保存在目前瀏覽器，不能用於真實倉儲警報或品質判定。</p></section>

      </div>
    </div>
  );
};

export default AdminDevices;
