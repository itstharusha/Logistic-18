import React from 'react';

/**
 * ErrorBoundary — Catches uncaught rendering exceptions and shows
 * a recovery UI instead of a white screen. (Audit Fix #4)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrapper}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E85D2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.message}>
              An unexpected error occurred. You can try reloading the page or going back to the dashboard.
            </p>
            {this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error details</summary>
                <pre style={styles.pre}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div style={styles.actions}>
              <button style={styles.btnPrimary} onClick={this.handleReload}>
                Reload Page
              </button>
              <button style={styles.btnSecondary} onClick={this.handleGoHome}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0E100E',
    fontFamily: "'Inter', sans-serif",
    padding: '24px',
  },
  card: {
    background: '#1A1C1A',
    borderRadius: '16px',
    padding: '48px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(232, 93, 47, 0.15)',
  },
  iconWrapper: {
    marginBottom: '24px',
  },
  title: {
    color: '#F5F5F0',
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 12px 0',
  },
  message: {
    color: '#9A9E9A',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    background: '#141614',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #2A2C2A',
  },
  summary: {
    color: '#9A9E9A',
    fontSize: '12px',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  pre: {
    color: '#E85D2F',
    fontSize: '11px',
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '150px',
    overflow: 'auto',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  btnPrimary: {
    background: '#E85D2F',
    color: '#F5F5F0',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  btnSecondary: {
    background: 'transparent',
    color: '#9A9E9A',
    border: '1px solid #3A3C3A',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
};

export default ErrorBoundary;
