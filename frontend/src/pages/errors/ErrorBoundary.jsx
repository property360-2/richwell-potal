import React, { Component } from 'react';
import { AlertOctagon } from 'lucide-react';
import Button from '../../components/ui/Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
          <AlertOctagon size={48} color="#DC2626" style={{ marginBottom: '24px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A', marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#475569', maxWidth: '400px', marginBottom: '24px' }}>
            We've encountered an unexpected error. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
          {import.meta.env.DEV && (
            <div style={{ marginTop: '32px', textAlign: 'left', backgroundColor: '#FEE2E2', padding: '16px', borderRadius: '8px', maxWidth: '800px', overflowX: 'auto' }}>
              <p style={{ fontWeight: 'bold', color: '#B91C1C', margin: 0 }}>{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
