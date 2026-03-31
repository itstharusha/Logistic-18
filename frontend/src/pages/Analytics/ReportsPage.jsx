/**
 * ReportsPage.jsx — Report Generation & Download page
 * Route: /reports
 *
 * Features:
 * - ReportForm (RBAC-gated generation)
 * - ReportTable (list of generated reports + download)
 * - Redux-connected
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Components
import ReportForm from '../../components/ReportForm.jsx';
import ReportTable from '../../components/ReportTable.jsx';
import Layout from '../../components/Layout.jsx';

// Redux actions
import { generateReport, downloadReport } from '../../redux/analyticsSlice.js';

// Styles
import './reports-page.css';

export default function ReportsPage() {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ✅ Safe selectors
  const reports = useSelector((state) => state.analytics?.reports ?? []);
  const reportLoading = useSelector((state) => state.analytics?.reportLoading ?? false);
  const downloadLoading = useSelector((state) => state.analytics?.downloadLoading ?? false);
  const reportError = useSelector((state) => state.analytics?.reportError ?? null);

  const handleGenerate = useCallback(
    (payload) => {
      dispatch(generateReport(payload));
    },
    [dispatch]
  );

  const handleDownload = useCallback(
    (reportId, format) => {
      dispatch(downloadReport({ reportId, format }));
    },
    [dispatch]
  );

  return (
    <Layout>
      <div className="rp-page">

        {/* HEADER */}
        <header className="rp-header">

          <div className="rp-header-left">

            <div className="rp-breadcrumb">
              <span>Analytics</span>
              <span className="rp-breadcrumb-sep">›</span>
              <span className="rp-breadcrumb-cur">Reports</span>
            </div>

            <h1 className="rp-title">Report Generation</h1>
            <p className="rp-subtitle">Generate and download supply chain risk reports</p>

          </div>

          {/* ✅ NAVIGATION BUTTONS */}
          <div style={{display:"flex", gap:"10px"}}>

            <button
              className="rp-download-btn"
              style={{width:"auto", padding:"9px 18px"}}
              onClick={() => navigate('/analytics')}
            >
              ← Analytics
            </button>

            <button
              className="rp-download-btn"
              style={{width:"auto", padding:"9px 18px"}}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>

          </div>

        </header>

        {/* ERROR MESSAGE */}
        {reportError && (
          <div className="rp-banner rp-banner-error">
            <AlertCircle size={14} />
            <span>{reportError}</span>
          </div>
        )}

        {/* MAIN LAYOUT */}
        <div className="rp-layout">

          {/* LEFT COLUMN */}
          <div className="rp-form-col">

            <ReportForm onGenerate={handleGenerate} loading={reportLoading} />

            {reports.length > 0 && (
              <div className="rp-latest-card glass-card">

                <h4 className="rp-latest-title">Latest Generated Report</h4>

                <dl className="rp-latest-dl">

                  <dt>Report ID</dt>
                  <dd className="rp-mono">{reports[0]?.reportId ?? '—'}</dd>

                  <dt>Type</dt>
                  <dd style={{ textTransform: 'capitalize' }}>
                    {reports[0]?.type ?? '—'}
                  </dd>

                  <dt>Format</dt>
                  <dd>
                    <span className={`rp-fmt-badge rp-fmt-${reports[0]?.format ?? 'pdf'}`}>
                      {reports[0]?.format?.toUpperCase() ?? 'PDF'}
                    </span>
                  </dd>

                  <dt>Generated At</dt>
                  <dd className="rp-mono">
                    {reports[0]?.generatedAt
                      ? new Date(reports[0].generatedAt).toLocaleString()
                      : '—'}
                  </dd>

                  <dt>Date Range</dt>
                  <dd className="rp-mono">
                    {reports[0]?.dateRange?.from ?? '—'} → {reports[0]?.dateRange?.to ?? '—'}
                  </dd>

                </dl>

                <button
                  className="rp-download-btn"
                  onClick={() => handleDownload(reports[0].reportId, reports[0].format)}
                  disabled={downloadLoading}
                >
                  {downloadLoading
                    ? 'Downloading...'
                    : `⬇ Download ${reports[0]?.format?.toUpperCase() ?? 'PDF'}`}
                </button>

              </div>
            )}

          </div>

          {/* RIGHT COLUMN */}
          <div className="rp-table-col">

            <ReportTable
              reports={reports}
              onDownload={handleDownload}
              downloadLoading={downloadLoading}
            />

          </div>

        </div>
      </div>
    </Layout>
  );
}