import React from 'react';
import './ExplainabilityPanel.css';

export function ExplainabilityPanel({ features = [], recommendations = [], domain = 'supplier' }) {
  if (!features || features.length === 0) {
    return null;
  }

  const shapFeatures = Array.isArray(features)
    ? features.map(f => (typeof f === 'object' ? f : null)).filter(Boolean)
    : [];

  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high':   return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low':    return '#3b82f6';
      default:       return '#6b7280';
    }
  };

  const getImpactLabel = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high':   return 'High';
      case 'medium': return 'Medium';
      case 'low':    return 'Low';
      default:       return 'Unknown';
    }
  };

  const maxAbsValue = Math.max(...shapFeatures.map(f => Math.abs(f.value ?? 0)), 1);

  return (
    <div className="explainability-panel">
      <div className="explainability-header">
        <h3>Model Explainability (SHAP Analysis)</h3>
        <p className="explainability-subtitle">
          Top features influencing the risk prediction for this {domain}
        </p>
      </div>

      <div className="shap-features-section">
        <h4>Top Contributing Features</h4>
        <div className="shap-features-grid">
          {shapFeatures.slice(0, 3).map((feature, idx) => (
            <ShapFeatureCard
              key={idx}
              rank={idx + 1}
              feature={feature}
              impactColor={getImpactColor(feature.impact)}
              impactLabel={getImpactLabel(feature.impact)}
              maxAbsValue={maxAbsValue}
            />
          ))}
        </div>
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-item">
                <span className="recommendation-icon">&#10003;</span>
                <span className="recommendation-text">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="shap-info">
        <p className="info-text">
          <strong>SHAP (SHapley Additive exPlanations)</strong> calculates each feature's
          contribution to the final risk score. Positive values raise risk; negative values lower it.
        </p>
      </div>
    </div>
  );
}

function ShapFeatureCard({ rank, feature, impactColor, impactLabel, maxAbsValue }) {
  const shapValue = typeof feature.value === 'number' ? feature.value : 0;
  const raisesRisk = shapValue >= 0;
  const barWidth = Math.min((Math.abs(shapValue) / maxAbsValue) * 100, 100);
  const barColor = raisesRisk ? '#ef4444' : '#2DB87A';
  const directionLabel = raisesRisk ? '↑ Raises Risk' : '↓ Lowers Risk';
  const directionColor = raisesRisk ? '#ef4444' : '#2DB87A';

  const friendlyName = (name) =>
    name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();

  return (
    <div className="shap-feature-card">
      <div className="feature-rank">
        <span className="rank-badge">{rank}</span>
      </div>

      <div className="feature-content">
        <h5 className="feature-name">{friendlyName(feature.feature)}</h5>

        <div className="shap-bar-track">
          <div
            className="shap-bar-fill"
            style={{ width: `${barWidth}%`, background: barColor }}
          />
        </div>

        <div className="feature-details">
          <div className="detail-row">
            <span className="detail-label">Contribution:</span>
            <span className="detail-value" style={{ color: directionColor, fontWeight: 700 }}>
              {shapValue >= 0 ? '+' : ''}{shapValue.toFixed(3)}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Direction:</span>
            <span className="detail-value" style={{ color: directionColor, fontSize: 11 }}>
              {directionLabel}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Impact:</span>
            <span
              className="impact-badge"
              style={{ backgroundColor: impactColor + '20', color: impactColor }}
            >
              {impactLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplainabilityPanel;
