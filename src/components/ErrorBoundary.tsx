import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0e17', color: '#fff', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Qualcosa è andato storto</h2>
          <p style={{ color: '#aaa', margin: 0 }}>Ricarica la pagina per riprovare.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.6rem 1.5rem', background: '#00e5ff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Ricarica
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
