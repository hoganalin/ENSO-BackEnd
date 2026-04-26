import { useState } from 'react';

const DEVICE_OVERRIDES_KEY = 'enso_device_overrides';

// 沒有真實 IoT 後端 — 把 ConfigModal 儲存的閾值/間隔寫進 localStorage，
// 重新整理仍會保留。這跟 AdminInventory 用 enso_inventory_logs 一樣，純前端持久化。
const loadOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_OVERRIDES_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveOverride = (id, partial) => {
  const all = loadOverrides();
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

  const handleExport = () => {
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
      } finally {
        setExporting(false);
      }
    }, 600);
  };

  return (
    <ModalWrapper onClose={onClose} title="數據文存導出 / ARCHIVAL EXPORT">
      {done ? (
        <div className="text-center py-10 md:py-16 animate-in fade-in zoom-in duration-700">
          <div className="text-5xl md:text-6xl text-[#3A4D39] mb-6 md:mb-8 font-serif opacity-30">
            ♢
          </div>
          <h5 className="font-serif text-xl md:text-2xl font-medium text-[#111111] mb-3 md:mb-4">
            文存封裝圓滿
          </h5>
          <p className="text-xs md:text-sm opacity-40 font-serif italic mb-8 md:mb-12 px-2">
            最近 {range} 天 共 {exportedRowCount.toLocaleString()}{' '}
            筆感測紀錄已封裝下載 ({format.toUpperCase()})。
          </p>
          <button
            className="px-10 md:px-12 py-3 bg-[#111111] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black hover:bg-[#984443] transition-all duration-500"
            onClick={onClose}
          >
            退出文卷 / EXIT
          </button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section>
            <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black text-[#111111]/30 block mb-3 md:mb-6">
              溯源週期 / TIME SPAN
            </label>
            <div className="grid grid-cols-3 gap-px bg-[#D1C7B7]/20 border border-[#D1C7B7]/20">
              {[
                { v: '7', l: '七日' },
                { v: '30', l: '三十日' },
                { v: '90', l: '季報' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  className={`py-3 md:py-4 text-[0.75rem] md:text-[0.75rem] font-black tracking-wider md:tracking-widest transition-all duration-500 ${
                    range === v
                      ? 'bg-[#111111] text-white'
                      : 'bg-transparent text-[#111111]/40 hover:bg-[#111111]/5 hover:text-[#111111]'
                  }`}
                  onClick={() => setRange(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black text-[#111111]/30 block mb-3 md:mb-6">
              封裝格式 / DATA TYPE
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
                      className="sr-only peer"
                      name="format"
                      checked={format === f}
                      onChange={() => setFormat(f)}
                    />
                    <div className="w-5 h-5 border border-[#D1C7B7] peer-checked:border-[#111111] peer-checked:bg-[#111111] transition-all duration-500"></div>
                    <div className="absolute inset-1 bg-white scale-0 peer-checked:scale-100 transition-transform duration-500 origin-center"></div>
                  </div>
                  <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                    .{f}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className="p-4 md:p-6 bg-[#FAF9F6] border-l border-[#984443] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.15em] md:tracking-[0.2em] font-bold opacity-50 italic">
              將匯出 {sensors.filter((s) => s.status === 'Online').length} 個
              Online 節點數據
            </span>
            <span className="text-xs font-serif italic text-[#984443] shrink-0">
              {range} DAYS
            </span>
          </div>

          <div className="pt-4 md:pt-8 flex flex-col sm:flex-row sm:justify-end gap-3 md:gap-6 sm:items-center border-t border-[#D1C7B7]/10">
            <button
              className="px-4 py-3 sm:py-0 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-bold text-[#111111]/60 hover:text-[#111111] transition-opacity order-2 sm:order-1"
              onClick={onClose}
            >
              撤回 / CANCEL
            </button>
            <button
              className="px-6 md:px-12 py-3 md:py-4 bg-[#111111] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black hover:bg-[#984443] transition-all duration-700 disabled:opacity-20 order-1 sm:order-2"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? '文卷封裝中...' : '開始導出 · EXECUTE'}
            </button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

/* ───────── 感測器配置 Modal ───────── */
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

  const handle = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: Number(e.target.value) }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      onSave(sensor.id, form);
    }, 1000);
  };

  const isSmoke = sensor.type === '煙霧偵測器';

  return (
    <ModalWrapper onClose={onClose} title={`裝置參數調律 — ${sensor.id}`}>
      {saved ? (
        <div className="text-center py-10 md:py-16 animate-in fade-in zoom-in duration-700">
          <div className="text-5xl md:text-6xl text-[#3A4D39] mb-6 md:mb-8 font-serif opacity-30">
            ♢
          </div>
          <h5 className="font-serif text-xl md:text-2xl font-medium text-[#111111] mb-3 md:mb-4">
            參數同步完成
          </h5>
          <p className="text-xs md:text-sm opacity-40 font-serif italic mb-8 md:mb-12 px-2 break-all">
            智網節點 {sensor.id} 已完成零時參數對應。
          </p>
          <button
            className="px-10 md:px-12 py-3 bg-[#111111] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black hover:bg-[#984443] transition-all duration-500"
            onClick={onClose}
          >
            退出 / EXIT
          </button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 md:p-8 bg-[#FAF9F6] grid grid-cols-2 gap-4 md:gap-12 border border-[#D1C7B7]/20">
            <div>
              <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.4em] font-black opacity-30 block mb-1 md:mb-2">
                LOCATION
              </span>
              <span className="text-xs md:text-sm font-serif italic text-[#111111] break-words">
                {sensor.location}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.4em] font-black opacity-30 block mb-1 md:mb-2">
                GENRE
              </span>
              <span className="text-[0.75rem] md:text-xs font-bold uppercase tracking-wider md:tracking-widest text-[#111111] break-words">
                {sensor.type}
              </span>
            </div>
          </div>

          {isSmoke ? (
            <div className="p-4 md:p-6 border-l border-[#984443] bg-[#FAF9F6] italic text-xs leading-relaxed opacity-60">
              煙霧偵測器目前僅支援回報頻率調校，其餘閾值由系統自動定序演算法進行即時監控。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-10">
              <section className="space-y-3 md:space-y-4 min-w-0">
                <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black text-[#984443] block px-1">
                  溫度警戒線 (°C)
                </label>
                <div className="flex gap-2 md:gap-4 items-center">
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#D1C7B7] py-2 text-base md:text-lg font-serif focus:outline-none focus:border-[#111111] transition-all"
                    value={form.alertMin}
                    onChange={handle('alertMin')}
                  />
                  <span className="opacity-30 text-[0.75rem] md:text-[0.75rem] shrink-0">
                    TO
                  </span>
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#D1C7B7] py-2 text-base md:text-lg font-serif focus:outline-none focus:border-[#111111] transition-all"
                    value={form.alertMax}
                    onChange={handle('alertMax')}
                  />
                </div>
              </section>
              <section className="space-y-3 md:space-y-4 min-w-0">
                <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black text-[#111111]/30 block px-1">
                  濕度警戒線 (%)
                </label>
                <div className="flex gap-2 md:gap-4 items-center">
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#D1C7B7] py-2 text-base md:text-lg font-serif focus:outline-none focus:border-[#111111] transition-all"
                    value={form.humidityMin}
                    onChange={handle('humidityMin')}
                  />
                  <span className="opacity-30 text-[0.75rem] md:text-[0.75rem] shrink-0">
                    TO
                  </span>
                  <input
                    type="number"
                    className="w-full min-w-0 bg-transparent border-b border-[#D1C7B7] py-2 text-base md:text-lg font-serif focus:outline-none focus:border-[#111111] transition-all"
                    value={form.humidityMax}
                    onChange={handle('humidityMax')}
                  />
                </div>
              </section>
            </div>
          )}

          <section>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 mb-4 md:mb-6 px-1">
              <label className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black text-[#111111]/30">
                物聯傳輸頻率 / SYNC RATE
              </label>
              <span className="text-xs md:text-sm font-serif italic text-[#984443]">
                每 {form.updateInterval} 分鐘同步一次
              </span>
            </div>
            <div className="relative pt-2">
              <input
                type="range"
                className="w-full h-[1px] bg-[#D1C7B7] appearance-none cursor-pointer accent-[#111111] relative z-10"
                min="1"
                max="30"
                step="1"
                value={form.updateInterval}
                onChange={handle('updateInterval')}
              />
              <div className="absolute top-[9px] left-0 w-full flex justify-between px-1 pointer-events-none">
                {[...Array(7)].map((_, i) => (
                  <span key={i} className="w-[1px] h-2 bg-[#D1C7B7]/40"></span>
                ))}
              </div>
            </div>
          </section>

          <div className="pt-4 md:pt-8 flex flex-col sm:flex-row sm:justify-end gap-3 md:gap-6 sm:items-center border-t border-[#D1C7B7]/10">
            <button
              className="px-4 py-3 sm:py-0 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-bold text-[#111111]/60 hover:text-[#111111] transition-opacity order-2 sm:order-1"
              onClick={onClose}
            >
              撤回
            </button>
            <button
              className="px-6 md:px-12 py-3 md:py-4 bg-[#111111] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black hover:bg-[#984443] transition-all duration-700 disabled:opacity-20 order-1 sm:order-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '同步協議中...' : '儲存調律 · ARCHIVE'}
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

  const steps = ['儀軌確認', '精準校律', '圓滿完成'];

  return (
    <ModalWrapper onClose={onClose} title={`裝置零位校準 — ${sensor.id}`}>
      <div className="flex justify-between items-center mb-8 md:mb-16 relative">
        <div className="absolute top-[12px] left-0 w-full h-[1px] bg-[#D1C7B7]/20 z-0"></div>
        {steps.map((s, i) => (
          <div
            key={s}
            className="relative z-10 flex flex-col items-center bg-white px-2 md:px-4"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.75rem] font-bold transition-all duration-1000 ${
                i <= step
                  ? 'bg-[#984443] text-white shadow-lg shadow-[#984443]/20'
                  : 'bg-[#FAF9F6] border border-[#D1C7B7]/40 text-[#111111]/20'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={`text-[0.75rem] md:text-[0.75rem] mt-2 md:mt-3 tracking-[0.15em] md:tracking-[0.3em] font-black uppercase whitespace-nowrap ${i <= step ? 'text-[#111111]' : 'opacity-10'}`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 animate-in fade-in duration-700">
        {step === 0 && (
          <div className="space-y-6 md:space-y-10">
            <div className="p-4 md:p-8 bg-[#FAF9F6] border border-[#D1C7B7]/20 space-y-3 md:space-y-4">
              <div className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[#984443] font-black italic">
                ⚠️ 智網校準儀軌 / PROTOCOL
              </div>
              <ul className="space-y-2 md:space-y-3 text-xs font-serif italic opacity-60 leading-relaxed pl-4 list-disc marker:text-[#984443]">
                <li>啟動校準後，節點將暫停傳輸約 150 秒以進行硬體重定序。</li>
                <li>
                  請確保安置環境處於沈香標準溫度 (22°C ± 0.5°C) 之靜態壓力下。
                </li>
                <li>此操作將重寫裝置基線，非專業工程師請謹慎決策。</li>
              </ul>
            </div>
            <div className="grid grid-cols-1 border border-[#D1C7B7]/10 divide-y divide-[#D1C7B7]/10">
              <div className="flex justify-between items-center gap-3 p-3 md:p-6">
                <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.4em] font-black opacity-40">
                  當前回傳測值
                </span>
                <span className="text-base md:text-xl font-serif text-[#111111] text-right break-all">
                  {sensor.lastValue}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 p-3 md:p-6">
                <span className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.4em] font-black opacity-40">
                  安置地點
                </span>
                <span className="text-xs md:text-sm font-serif italic text-[#111111] text-right break-words">
                  {sensor.location}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 md:gap-6 pt-4 sm:items-center">
              <button
                className="px-4 py-3 sm:py-0 text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-bold text-[#111111]/60 hover:text-[#111111] transition-opacity order-2 sm:order-1"
                onClick={onClose}
              >
                撤回
              </button>
              <button
                className="px-6 md:px-12 py-3 md:py-4 bg-[#111111] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black hover:bg-[#984443] transition-all duration-700 disabled:opacity-20 order-1 sm:order-2"
                onClick={handleStart}
                disabled={sensor.status === 'Offline'}
              >
                {sensor.status === 'Offline'
                  ? '節點離線 · OFFLINE'
                  : '啟動校準 · CALIBRATE'}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="text-center py-12 md:py-20 flex flex-col items-center">
            <div className="relative mb-8 md:mb-12">
              <div className="w-16 h-16 border border-[#D1C7B7]/30 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 w-16 h-16 border-2 border-[#111111] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h6 className="font-serif italic text-xl md:text-2xl text-[#111111] mb-3 md:mb-4">
              精準校律進行中...
            </h6>
            <p className="text-[0.75rem] md:text-xs opacity-40 font-black tracking-widest uppercase">
              Base alignment in progress.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-10 md:py-16 animate-in zoom-in fade-in duration-1000">
            <div className="text-5xl md:text-6xl text-[#3A4D39] mb-6 md:mb-10 font-serif opacity-30">
              ♢
            </div>
            <h5 className="font-serif text-2xl md:text-3xl font-medium text-[#111111] mb-3 md:mb-4">
              校準儀軌圓滿
            </h5>
            <p className="text-xs md:text-sm opacity-40 italic font-serif mb-8 md:mb-12 break-words px-2">
              感測器 {sensor.id} 已完成零位基線化處理。
            </p>
            <button
              className="px-10 md:px-16 py-3 md:py-4 bg-[#111111] text-white text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black hover:bg-[#984443] transition-colors"
              onClick={onClose}
            >
              退出協議 · EXIT
            </button>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

/* ───────── 通用 Modal 框架 ───────── */
function ModalWrapper({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-12"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-[#111111]/90 backdrop-blur-md animate-in fade-in duration-500"></div>
      <div className="relative bg-white w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] shadow-2xl rounded-sm overflow-hidden border border-[#D1C7B7]/30 flex flex-col animate-in zoom-in fade-in duration-700">
        <div className="px-4 py-3 md:p-8 border-b border-[#D1C7B7]/10 flex justify-between items-center gap-3 bg-[#FAF9F6] shrink-0">
          <h5 className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.5em] font-black text-[#111111] opacity-60 truncate">
            {title}
          </h5>
          <button
            className="w-8 h-8 flex items-center justify-center border border-[#111111]/20 hover:border-[#111111] text-[#111111] opacity-60 hover:opacity-100 transition-all shrink-0"
            onClick={onClose}
          >
            <span className="text-base font-light">✕</span>
          </button>
        </div>
        <div className="p-4 md:p-12 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#FAF9F6] px-3 py-3 md:px-6 md:py-12 font-sans text-[#111111]">
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
      <div className="max-w-7xl mx-auto mb-6 md:mb-20">
        <div className="flex flex-row md:items-end justify-between gap-3 md:gap-8 border-b border-[#D1C7B7] pb-3 md:pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div className="min-w-0">
            <div className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.6em] text-[#984443] font-bold mb-1 md:mb-4 opacity-80">
              Smart Network
            </div>
            <h2 className="font-serif text-lg md:text-5xl font-medium tracking-tight text-[#111111]">
              物聯監儀
              <span className="hidden md:inline text-[0.5em] ml-4 opacity-20 font-sans tracking-widest uppercase">
                DEVICE NETWORK MONITOR
              </span>
            </h2>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 shrink-0 self-end">
            <button
              className="group relative px-3 md:px-8 py-2 md:py-4 overflow-hidden transition-all duration-300 border border-[#D1C7B7] hover:border-[#111111]"
              onClick={openExport}
            >
              <span className="relative text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-[#111111]/60 group-hover:text-[#111111] transition-colors whitespace-nowrap">
                <span className="md:hidden">導出</span>
                <span className="hidden md:inline">數據文存導出 · EXPORT</span>
              </span>
            </button>
            <button
              className="group relative px-3 md:px-8 py-2 md:py-4 overflow-hidden transition-all duration-700 bg-[#111111] shadow-xl hover:shadow-[#984443]/20"
              onClick={() => openConfig(sensors[0])}
            >
              <span className="relative text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-white whitespace-nowrap">
                <span className="md:hidden">配置</span>
                <span className="hidden md:inline">全域配置 · CONFIG</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-12 mb-24">
        {/* Mobile Card List */}
        <div className="md:hidden px-1 space-y-3">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className="border border-[#D1C7B7]/40 bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs tracking-tighter font-bold text-[#111111] break-all">
                    {sensor.id}
                  </div>
                  <div className="text-[0.75rem] opacity-30 uppercase tracking-widest mt-1">
                    {sensor.type} · {sensor.location}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sensor.status === 'Online' ? 'bg-[#3A4D39]' : 'bg-[#984443] animate-pulse'}`}
                  ></span>
                  <span
                    className={`text-[0.75rem] uppercase tracking-[0.15em] font-bold ${sensor.status === 'Online' ? 'text-[#3A4D39]' : 'text-[#984443]'}`}
                  >
                    {sensor.status === 'Online' ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#D1C7B7]/30">
                <div className="flex items-baseline gap-1">
                  <span className="text-[0.75rem] uppercase tracking-widest opacity-40">
                    測值
                  </span>
                  <span
                    className={`font-serif text-xl font-medium ${sensor.status === 'Offline' ? 'opacity-10' : 'text-[#111111]'}`}
                  >
                    {sensor.lastValue}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                  <div className="flex-1 h-[2px] bg-[#D1C7B7]/30 overflow-hidden relative">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all duration-1000 ${sensor.battery < 20 ? 'bg-[#984443]' : 'bg-[#111111]'}`}
                      style={{ width: `${sensor.battery}%` }}
                    />
                  </div>
                  <span className="text-[0.75rem] font-mono opacity-40">
                    {sensor.battery}%
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-4 text-[0.75rem]">
                <button
                  className="uppercase tracking-[0.15em] font-bold text-[#111111]/60 hover:text-[#111111]"
                  onClick={() => openCalibrate(sensor)}
                >
                  校準
                </button>
                <button
                  className="uppercase tracking-[0.15em] font-bold text-[#111111]/60 hover:text-[#111111]"
                  onClick={() => openConfig(sensor)}
                >
                  配置
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto px-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D1C7B7]/30 text-[0.75rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40">
                <th className="px-4 py-8">節點辨識 / NODE ID</th>
                <th className="px-4 py-8">安置區域 / LOCATION</th>
                <th className="px-4 py-8 text-center">連線狀態 / STATUS</th>
                <th className="px-4 py-8">回傳測值 / TELEMETRY</th>
                <th className="px-4 py-8">能源存量 / POWER</th>
                <th className="px-4 py-8 text-right">核定操作 / ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1C7B7]/10">
              {sensors.map((sensor) => (
                <tr
                  key={sensor.id}
                  className="hover:bg-[#111111]/[0.02] transition-colors duration-500 group"
                >
                  <td className="px-4 py-10">
                    <div className="font-mono text-sm tracking-tighter font-bold text-[#111111] group-hover:text-[#984443] transition-colors">
                      {sensor.id}
                    </div>
                    <div className="text-[0.75rem] opacity-30 uppercase tracking-widest mt-2">
                      {sensor.type}
                    </div>
                  </td>
                  <td className="px-4 py-10">
                    <div className="text-sm font-serif italic text-[#111111]/60">
                      {sensor.location}
                    </div>
                  </td>
                  <td className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${sensor.status === 'Online' ? 'bg-[#3A4D39]' : 'bg-[#984443] animate-pulse'}`}
                      ></span>
                      <span
                        className={`text-[0.75rem] uppercase tracking-[0.2em] font-bold ${sensor.status === 'Online' ? 'text-[#3A4D39]' : 'text-[#984443]'}`}
                      >
                        {sensor.status === 'Online'
                          ? 'Connected'
                          : 'Disconnected'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-10">
                    <span
                      className={`font-serif text-2xl font-medium tracking-tighter ${sensor.status === 'Offline' ? 'opacity-10' : 'text-[#111111]'}`}
                    >
                      {sensor.lastValue}
                    </span>
                  </td>
                  <td className="px-4 py-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-[1px] bg-[#D1C7B7]/30 overflow-hidden relative">
                        <div
                          className={`absolute left-0 top-0 h-full transition-all duration-1000 ${sensor.battery < 20 ? 'bg-[#984443]' : 'bg-[#111111]'}`}
                          style={{ width: `${sensor.battery}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono opacity-20">
                        {sensor.battery}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-10 text-right">
                    <div className="inline-flex gap-8">
                      <button
                        className="text-[0.75rem] uppercase tracking-[0.3em] font-bold text-[#111111]/30 hover:text-[#111111] transition-colors duration-300"
                        onClick={() => openCalibrate(sensor)}
                      >
                        校準 / CAL
                      </button>
                      <button
                        className="text-[0.75rem] uppercase tracking-[0.3em] font-bold text-[#111111]/30 hover:text-[#111111] transition-colors duration-300"
                        onClick={() => openConfig(sensor)}
                      >
                        配置 / SET
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Curator's Note Section - Editorial Style */}
        <div className="mt-12 group">
          <div className="bg-[#111111] p-px">
            <div className="bg-[#FAF9F6] p-16 relative overflow-hidden flex flex-col md:flex-row gap-16">
              {/* Decorative Kumiko-like accent */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none">
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="0.5"
                >
                  <path d="M0,0 L100,100 M100,0 L0,100 M50,0 L50,100 M0,50 L100,50" />
                </svg>
              </div>

              <div className="md:w-1/4">
                <div className="text-[0.75rem] uppercase tracking-[0.6em] text-[#984443] font-black mb-6">
                  Curator's Note
                </div>
                <div className="w-12 h-px bg-[#111111]/20 mb-8"></div>
                <h5 className="font-serif text-2xl leading-snug text-[#111111]">
                  數據一致性與環境標準說明
                </h5>
              </div>

              <div className="flex-grow space-y-8 max-w-3xl">
                <p className="text-sm font-serif italic leading-relaxed text-[#111111]/60">
                  此監控面板匯錄分布於工坊各處之實體感測節點數據。首頁總覽
                  (Overview) 所視之 A / B 倉數值，
                  乃是由此處節點數據經由物聯網閘道器 (Gateway)
                  進行即時權重校對後得出，以確保環境數據之絕對精準。
                </p>
                <div className="grid grid-cols-2 gap-12 pt-8 border-t border-[#D1C7B7]/30">
                  <div className="space-y-4">
                    <span className="text-[0.75rem] uppercase tracking-[0.4em] font-black opacity-30">
                      溫度保存閾值 / TEMP
                    </span>
                    <div className="font-serif text-lg">22°C - 25°C</div>
                  </div>
                  <div className="space-y-4">
                    <span className="text-[0.75rem] uppercase tracking-[0.4em] font-black opacity-30">
                      濕度保存閾值 / HUMID
                    </span>
                    <div className="font-serif text-lg">45% - 55%</div>
                  </div>
                </div>
                <p className="text-[0.75rem] opacity-30 italic font-serif">
                  任何毫釐之差皆會觸發系統警示，以守護時光之香火。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDevices;
