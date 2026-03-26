/**
 * ReportTable.jsx — Table of generated reports with download action
 */
import React from 'react';
import { Download, FileText, Loader } from 'lucide-react';

// ✅ FIXED CSS PATH
import '../styles/analytics-components.css';

/**
 * @param {object} props
 * @param {Array} props.reports - Array of report objects
 * @param {function} props.onDownload - fn(reportId, format)
 * @param {boolean} [props.downloadLoading]
 */
export default function ReportTable({ reports = [], onDownload, downloadLoading = false }) {
  if (!reports.length) {
    return (
      <div className="an-report-table-empty glass-card">
        <FileText size={32} strokeWidth={1.5} className="an-empty-icon" />
        <p>No reports generated yet.</p>
        <p className="an-empty-sub">Use the form above to generate your first report.</p>
      </div>
    );
  }

  return (
    <div className="an-report-table-wrap glass-card">
      <h3 className="an-chart-title">Generated Reports</h3>
      <div className="an-table-scroll">
        <table className="an-report-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Type</th>
              <th>Format</th>
              <th>Date Range</th>
              <th>Generated At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {reports.map((report) => (
              <tr key={report.reportId}>
                <td className="an-report-id">{report.reportId}</td>

                <td>
                  <span className="an-badge-type">{report.type}</span>
                </td>

                <td>
                  <span className={`an-badge-format an-badge-format-${report.format}`}>
                    {report.format?.toUpperCase()}
                  </span>
                </td>

                <td className="an-date-range">
                  {report.dateRange?.from && report.dateRange?.to
                    ? `${report.dateRange.from} → ${report.dateRange.to}`
                    : '—'}
                </td>

                <td className="an-generated-at">
                  {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : '—'}
                </td>

                <td>
                  <button
                    className="an-btn an-btn-outline an-download-btn"
                    onClick={() => onDownload(report.reportId, report.format)}
                    disabled={downloadLoading}
                    title={`Download ${report.format?.toUpperCase()}`}
                  >
                    {downloadLoading ? (
                      <Loader size={14} className="an-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}