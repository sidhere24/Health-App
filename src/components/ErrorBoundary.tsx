import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep UI clean without noisy console output in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3">
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Something interrupted HydraPrep
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your saved profile and meal logs remain stored safely on this device. Reload the app to resume cleanly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
            >
              Reload HydraPrep
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
