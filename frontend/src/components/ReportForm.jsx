/**
 * ReportForm.jsx — Report generation form with type, format, and date range selectors
 * ✅ Test mode: frontend RBAC restriction removed for local testing
 *
 * Features:
 * - Module selector
 * - Severity selector
 * - Include sections (KPI / Charts / Details)
 * - Payload includes module, severity, include
 */
import React, { useState } from 'react';
import { FileText, Download, Loader, Calendar, AlertCircle } from 'lucide-react';

// ✅ FIXED CSS PATH (CSS in src/styles/)
import '../styles/analytics-components.css';

/**
 * @param {object} props
 * @param {function} props.onGenerate - fn({ type, format, dateRange, module, severity, include })
 * @param {boolean} [props.loading] - external loading state
 */
export default function ReportForm({ onGenerate, loading = false }) {
  // Existing state
  const [reportType, setReportType] = useState('monthly');
  const [format, setFormat] = useState('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formError, setFormError] = useState('');

  // Added state
  const [module, setModule] = useState('overall');
  const [severity, setSeverity] = useState('all');
  const [include, setInclude] = useState({
    kpis: true,
    charts: true,
    details: true,
  });

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    // Validate custom range
    if (reportType === 'custom') {
      if (!dateFrom || !dateTo) {
        setFormError('Please select both start and end dates.');
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fromD = new Date(dateFrom);
      const toD = new Date(dateTo);
      
      if (fromD > today || toD > today) {
        setFormError('Custom date range cannot include future dates.');
        return;
      }
      
      if (fromD > toD) {
        setFormError('Start date cannot be after end date.');
        return;
      }
    }

    const now = new Date();
    let from, to;

    // Existing date logic
    switch (reportType) {
      case 'weekly': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        from = d.toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
        break;
      }
      case 'monthly': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        from = d.toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
        break;
      }
      case 'custom':
        from = dateFrom;
        to = dateTo;
        break;
      default:
        from = dateFrom;
        to = dateTo;
    }

    onGenerate({
      type: reportType,
      format,
      module,
      severity,
      include,
      dateRange: { from, to },
    });
  }

  return (
    <form className="an-report-form glass-card" onSubmit={handleSubmit} noValidate>
      <div className="an-form-header">
        <FileText size={18} />
        <h3>Generate New Report</h3>
      </div>

      {formError && (
        <div className="an-form-error">
          <AlertCircle size={14} />
          <span>{formError}</span>
        </div>
      )}

      <div className="an-form-grid">
        {/* Report Type */}
        <div className="an-form-group">
          <label htmlFor="report-type">Report Type</label>
          <div className="an-type-btns">
            {['weekly', 'monthly', 'custom'].map((t) => (
              <button
                key={t}
                type="button"
                className={`an-type-btn ${reportType === t ? 'active' : ''}`}
                onClick={() => setReportType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="an-form-group">
          <label htmlFor="report-format">Format</label>
          <div className="an-type-btns">
            {['pdf', 'csv'].map((f) => (
              <button
                key={f}
                type="button"
                className={`an-type-btn ${format === f ? 'active' : ''}`}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Module */}
        <div className="an-form-group">
          <label htmlFor="report-module">Module</label>
          <select
            id="report-module"
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="overall">Overall (All Modules)</option>
            <option value="supplier_risk">Supplier Risk</option>
            <option value="shipment_tracking">Shipment Tracking</option>
            <option value="inventory">Inventory</option>
            <option value="alerts">Alerts</option>
          </select>
        </div>

        {/* Severity */}
        <div className="an-form-group">
          <label htmlFor="report-severity">Severity</label>
          <select
            id="report-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Custom Date Range */}
        {reportType === 'custom' && (
          <>
            <div className="an-form-group">
              <label htmlFor="report-from">
                <Calendar size={12} /> From
              </label>
              <input
                id="report-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
              />
            </div>

            <div className="an-form-group">
              <label htmlFor="report-to">
                <Calendar size={12} /> To
              </label>
              <input
                id="report-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {/* Include sections */}
        <div className="an-form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Include</label>
          <div className="an-type-btns" style={{ flexWrap: 'wrap' }}>
            <label className="an-inline-check">
              <input
                type="checkbox"
                checked={include.kpis}
                onChange={(e) => setInclude((p) => ({ ...p, kpis: e.target.checked }))}
              />
              KPI Summary
            </label>

            <label className="an-inline-check">
              <input
                type="checkbox"
                checked={include.charts}
                onChange={(e) => setInclude((p) => ({ ...p, charts: e.target.checked }))}
              />
              Charts/Trends
            </label>

            <label className="an-inline-check">
              <input
                type="checkbox"
                checked={include.details}
                onChange={(e) => setInclude((p) => ({ ...p, details: e.target.checked }))}
              />
              Detailed Table
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="an-btn an-btn-primary an-generate-btn"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader size={15} className="an-spin" /> Generating…
          </>
        ) : (
          <>
            <Download size={15} /> Generate Report
          </>
        )}
      </button>
    </form>
  );
}