

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-scale-up">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl">
              ⚠️
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-4 tracking-tight uppercase">System Error</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Something went wrong while rendering this view. Your progress has been saved where possible.
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl mb-8 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Trace</p>
              <p className="text-xs text-slate-600 font-mono break-all line-clamp-3">
                {this.state.error?.message || 'Unknown exception occurred.'}
              </p>
            </div>
            <button 
              onClick={this.handleReset}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all transform active:scale-95"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // senior-engineer: Access children via props in class component. Added 'any' type assertion on 'this' to resolve TypeScript property detection issues for inherited members.
    return (this as any).props.children;
  }
}

export default ErrorBoundary;
