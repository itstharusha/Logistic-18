import React from 'react';
import './ExplainabilityPanel.css';

/**
 * ExplainabilityPanel Component
 * Displays SHAP feature importance and ML recommendations
 * 
 * Props:
 *   - features: Array of SHAP features with {feature, value, shap_value, impact}
 *   - recommendations: Array of recommendation strings
 *   - domain: 'supplier' | 'shipment' | 'inventory'
 */
export function ExplainabilityPanel({ features = [], recommendations = [], domain = 'supplier' }) {
  if (!features || features.length === 0) {
    return null;
  }

  // Extract feature data from SHAP values
  const shapFeatures = Array.isArray(features) 
    ? features.map(f => {
        // Handle both direct objects and string representations
        if (typeof f === 'object') {
          return f;
        }
        return null;
      }).filter(Boolean)
    : [];

  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // amber
      case 'low':
        return '#3b82f6'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  const getImpactBadge = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'ðŸ”´ High';
      case 'medium':
        return 'ðŸŸ  Medium';
      case 'low':
        return 'ðŸ”µ Low';
      default:
        return 'âšª Unknown';
    }
  };

  return (
    <div className="explainability-panel">
      <div className="explainability-header">
        <h3>ðŸ” Model Explainability (SHAP Analysis)</h3>
        <p className="explainability-subtitle">
          These are the top features influencing the risk prediction for this {domain}
        </p>
      </div>

      {/* Top Features */}
      <div className="shap-features-section">
        <h4>Top Contributing Features</h4>
        <div className="shap-features-grid">
          {shapFeatures.slice(0, 3).map((feature, idx) => (
            <ShapFeatureCard
              key={idx}
              rank={idx + 1}
              feature={feature}
              impactColor={getImpactColor(feature.impact)}
              impactBadge={getImpactBadge(feature.impact)}
            />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>ðŸ’¡ Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-item">
                <span className="recommendation-icon">âœ“</span>
                <span className="recommendation-text">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHAP Info */}
      <div className="shap-info">
        <p className="info-text">
          <strong>SHAP (SHapley Additive exPlanations)</strong> helps explain individual predictions 
          by calculating each feature's contribution to the final risk score.
        </p>
      </div>
    </div>
  );
}

/**
 * ShapFeatureCard Component
 * Individual feature importance card
 */
function ShapFeatureCard({ rank, feature, impactColor, impactBadge }) {
  const getFeatureFriendlyName = (featureName) => {
    return featureName
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/Delay/i, 'Delay')
      .replace(/Delivery/i, 'Delivery')
      .trim();
  };

  return (
    <div className="shap-feature-card">
      <div className="feature-rank">
        <span className="rank-badge">{rank}</span>
      </div>

      <div className="feature-content">
        <h5 className="feature-name">
          {getFeatureFriendlyName(feature.feature)}
        </h5>

        <div className="feature-details">
          <div className="detail-row">
            <span className="detail-label">Value:</span>
            <span className="detail-value">
              {typeof feature.feature_value === 'number' 
                ? feature.feature_value.toFixed(2) 
                : feature.value?.toFixed(2) || 'N/A'}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">SHAP Impact:</span>
            <span className="detail-value">
              {typeof feature.shap_value === 'number' 
                ? feature.shap_value.toFixed(4) 
                : (feature.value?.toFixed(4) || 'N/A')}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Importance:</span>
            <span 
              className="impact-badge" 
              style={{ backgroundColor: impactColor + '20', color: impactColor }}
            >
              {impactBadge}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplainabilityPanel;
