import React, { useState } from 'react';

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
function ExportModal({ onClose }) {
  const [range, setRange] = useState('7');
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setDone(true);
    }, 1500);
  };

  return (
    <ModalWrapper onClose={onClose} title="📊 歷史數據導出">
      {done ? (
        <div className="text-center py-4">
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h5 className="fw-bold mt-3 text-success">導出成功！</h5>
          <p className="text-muted small">
            最近 {range} 天的感測器數據已準備完成，瀏覽器即將開始下載。
          </p>
          <button className="btn btn-dark rounded-pill px-4 mt-2" onClick={onClose}>
            關閉
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <label className="form-label fw-semibold text-dark small">時間範圍</label>
            <div className="d-flex gap-2" style={{ flexWrap: 'nowrap' }}>
              {[
                { v: '7', l: '最近 7 天' },
                { v: '30', l: '最近 30 天' },
                { v: '90', l: '最近 3 個月' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  className={`btn btn-sm rounded-pill flex-grow-1 px-1 ${
                    range === v ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setRange(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold text-dark small">檔案格式</label>
            <div className="d-flex gap-2">
              {['csv', 'json', 'xlsx'].map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm rounded-pill px-3 ${format === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFormat(f)}
                >
                  .{f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-3 mb-4" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
            <small className="text-muted">
              📋 將導出 <strong>5 個感測器</strong>，共 <strong>{range} 天</strong> 的數據紀錄，格式為 <strong>.{format.toUpperCase()}</strong>
            </small>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>取消</button>
            <button className="btn btn-dark rounded-pill px-4" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <><span className="spinner-border spinner-border-sm me-2" />導出中...</>
              ) : '確認導出'}
            </button>
          </div>
        </>
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

  const handle = (k) => (e) => setForm((p) => ({ ...p, [k]: Number(e.target.value) }));

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
    <ModalWrapper onClose={onClose} title={`⚙️ 感測器配置 — ${sensor.id}`}>
      {saved ? (
        <div className="text-center py-4">
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h5 className="fw-bold mt-3 text-success">配置已儲存！</h5>
          <p className="text-muted small">感測器 {sensor.id} 的設定已成功更新。</p>
          <button className="btn btn-dark rounded-pill px-4 mt-2" onClick={onClose}>關閉</button>
        </div>
      ) : (
        <>
          <div className="mb-3 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
            <div className="d-flex gap-3 flex-wrap">
              <small className="text-muted">📍 {sensor.location}</small>
              <small className="text-muted">🔧 {sensor.type}</small>
            </div>
          </div>

          {isSmoke ? (
            <div className="alert alert-info small mb-3">
              煙霧偵測器目前僅支援回報頻率調整，溫濕度閾值不適用。
            </div>
          ) : (
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">溫度下限 (°C)</label>
                <input type="number" className="form-control form-control-sm" value={form.alertMin} onChange={handle('alertMin')} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">溫度上限 (°C)</label>
                <input type="number" className="form-control form-control-sm" value={form.alertMax} onChange={handle('alertMax')} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">濕度下限 (%)</label>
                <input type="number" className="form-control form-control-sm" value={form.humidityMin} onChange={handle('humidityMin')} />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">濕度上限 (%)</label>
                <input type="number" className="form-control form-control-sm" value={form.humidityMax} onChange={handle('humidityMax')} />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="form-label small fw-semibold">回報頻率（每 X 分鐘）</label>
            <input
              type="range" className="form-range" min="1" max="30" step="1"
              value={form.updateInterval} onChange={handle('updateInterval')}
            />
            <div className="text-center">
              <span className="badge bg-primary rounded-pill">每 {form.updateInterval} 分鐘</span>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>取消</button>
            <button className="btn btn-primary rounded-pill px-4" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />儲存中...</> : '儲存配置'}
            </button>
          </div>
        </>
      )}
    </ModalWrapper>
  );
}

/* ───────── 校準 Modal ───────── */
function CalibrateModal({ sensor, onClose }) {
  const [step, setStep] = useState(0); // 0=確認 1=校準中 2=完成

  const handleStart = () => {
    setStep(1);
    setTimeout(() => setStep(2), 2000);
  };

  const steps = ['確認校準', '校準中', '校準完成'];

  return (
    <ModalWrapper onClose={onClose} title={`🔧 感測器校準 — ${sensor.id}`}>
      {/* 進度條 */}
      <div className="d-flex align-items-center mb-4 gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold mb-1`}
                style={{
                  width: 28, height: 28, fontSize: '0.7rem',
                  background: i <= step ? '#0d6efd' : '#dee2e6',
                  color: i <= step ? '#fff' : '#adb5bd',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <small style={{ fontSize: '0.65rem', color: i <= step ? '#0d6efd' : '#adb5bd', whiteSpace: 'nowrap' }}>{s}</small>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: 2, flex: 2, background: i < step ? '#0d6efd' : '#dee2e6', marginBottom: 16 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="p-3 rounded-3 mb-4" style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
            <small className="text-warning-emphasis fw-semibold">⚠️ 注意事項</small>
            <ul className="small text-muted mb-0 mt-2 ps-3">
              <li>校準過程中感測器將暫停數據回報（約 2 分鐘）</li>
              <li>請確認環境溫度約在 22°C-25°C 之間</li>
              <li>校準後數據將自動重新基線化</li>
            </ul>
          </div>
          <div className="mb-4 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
            <div className="row g-2">
              <div className="col-6"><small className="text-muted">感測器</small><div className="fw-semibold small">{sensor.id}</div></div>
              <div className="col-6"><small className="text-muted">位置</small><div className="fw-semibold small">{sensor.location}</div></div>
              <div className="col-6"><small className="text-muted">型號</small><div className="fw-semibold small">{sensor.type}</div></div>
              <div className="col-6"><small className="text-muted">當前數值</small><div className="fw-semibold small text-primary">{sensor.lastValue}</div></div>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>取消</button>
            <button className="btn btn-primary rounded-pill px-4" onClick={handleStart} disabled={sensor.status === 'Offline'}>
              {sensor.status === 'Offline' ? '裝置離線中' : '開始校準'}
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h6 className="fw-bold">校準中，請稍候…</h6>
          <p className="text-muted small">系統正在重新基線化感測器數值，<br />此過程約需 30 秒至 2 分鐘。</p>
        </div>
      )}

      {step === 2 && (
        <div className="text-center py-4">
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h5 className="fw-bold mt-3 text-success">校準完成！</h5>
          <p className="text-muted small">感測器 {sensor.id} 已完成重新校準，數據已恢復回報。</p>
          <button className="btn btn-dark rounded-pill px-4 mt-2" onClick={onClose}>關閉</button>
        </div>
      )}
    </ModalWrapper>
  );
}

/* ───────── 通用 Modal 框架 ───────── */
function ModalWrapper({ title, onClose, children }) {
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-4 shadow-lg p-4"
        style={{ width: '100%', maxWidth: '480px', margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1rem' }}>{title}</h5>
          <button className="btn-close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────── 主元件 ───────── */
const AdminDevices = () => {
  const [sensors, setSensors] = useState(INITIAL_SENSORS);
  const [modal, setModal] = useState(null); // { type: 'export'|'config'|'calibrate', sensor? }

  const openExport = () => setModal({ type: 'export' });
  const openConfig = (sensor) => setModal({ type: 'config', sensor });
  const openCalibrate = (sensor) => setModal({ type: 'calibrate', sensor });
  const closeModal = () => setModal(null);

  const handleSaveConfig = (id, form) => {
    setSensors((prev) => prev.map((s) => (s.id === id ? { ...s, ...form } : s)));
  };

  return (
    <div className="container-fluid px-4 py-4">
      {/* Modal 渲染 */}
      {modal?.type === 'export' && <ExportModal onClose={closeModal} />}
      {modal?.type === 'config' && <ConfigModal sensor={modal.sensor} onClose={closeModal} onSave={handleSaveConfig} />}
      {modal?.type === 'calibrate' && <CalibrateModal sensor={modal.sensor} onClose={closeModal} />}

      <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-center mb-4 gap-3">
        <h2 className="fw-bold mb-0 text-dark text-center text-md-start">🌡️ 智慧倉儲感測系統</h2>
        <div className="d-flex gap-2 flex-wrap justify-content-center">
          <button className="btn btn-outline-dark rounded-pill px-4 shadow-sm text-nowrap" onClick={openExport}>
            歷史數據導出
          </button>
          <button
            className="btn btn-primary rounded-pill px-4 shadow-sm text-nowrap"
            onClick={() => openConfig(sensors[0])}
          >
            感測器配置
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-12">
          <div className="card custom-card shadow-sm border-0 bg-white">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr className="small text-uppercase fw-bold text-muted">
                      <th className="px-2 px-md-4 py-3">感測器 ID</th>
                      <th className="d-none d-md-table-cell">安置區域</th>
                      <th>連線狀態</th>
                      <th>當前測值</th>
                      <th className="d-none d-md-table-cell">電量狀態</th>
                      <th className="text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map((sensor) => (
                      <tr key={sensor.id}>
                        <td className="px-2 px-md-4 py-2" style={{ maxWidth: '90px' }}>
                          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.8rem' }}>{sensor.id}</div>
                          <small className="text-muted d-none d-md-block">{sensor.type}</small>
                        </td>
                        <td className="fw-medium text-secondary d-none d-md-table-cell">{sensor.location}</td>
                        <td>
                          {sensor.status === 'Online' ? (
                            <span className="badge bg-success-subtle text-success border border-success rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                              <span className="d-inline-block bg-success rounded-circle me-1" style={{ width: '6px', height: '6px' }} />
                              正常
                            </span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger border border-danger rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                              <span className="d-inline-block bg-danger rounded-circle me-1" style={{ width: '6px', height: '6px' }} />
                              異常
                            </span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            className={`fw-bold mb-0 ${sensor.status === 'Offline' ? 'text-muted' : 'text-primary'}`}
                            style={{ fontSize: '0.85rem' }}
                          >
                            {sensor.lastValue}
                          </span>
                        </td>
                        <td className="d-none d-md-table-cell">
                          <div className="d-flex align-items-center" style={{ width: '60px' }}>
                            <div className="progress flex-grow-1" style={{ height: '6px', borderRadius: '10px' }}>
                              <div
                                className={`progress-bar ${sensor.battery < 20 ? 'bg-danger' : 'bg-primary'}`}
                                style={{ width: `${sensor.battery}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-1 px-md-3">
                          <div className="d-flex gap-1 justify-content-center">
                            <button
                              className="btn btn-outline-primary btn-sm rounded-pill px-2"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => openCalibrate(sensor)}
                            >
                              校準
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm rounded-pill px-2"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => openConfig(sensor)}
                            >
                              設定
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-12">
          <div className="p-4 rounded-4" style={{ backgroundColor: '#e9ecef', border: '1px dashed #ced4da' }}>
            <div className="d-flex align-items-center mb-2">
              <span className="badge bg-dark me-2">PRO Tips</span>
              <h6 className="fw-bold mb-0 text-dark">數據一致性說明</h6>
            </div>
            <p className="text-muted small mb-0">
              此分頁顯示的是分布於倉庫各角落的實體節點數據。總覽面板 (Overview) 顯示的 A / B
              倉數值，是由此處感測器數據進行即時加權平均計算後得出。
              所有溫溼度變動均符合沈香保存之標準閾值 (22°C-25°C / 45%-55%)。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDevices;
