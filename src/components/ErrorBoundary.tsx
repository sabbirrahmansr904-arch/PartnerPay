import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-200 text-center">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">কিছু একটা ভুল হয়েছে</h2>
            <p className="text-zinc-500 mb-6">
              {this.state.error?.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
            >
              অ্যাপ্লিকেশন রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
