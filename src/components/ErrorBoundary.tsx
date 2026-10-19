import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F2] text-[#252B2A] flex items-center justify-center p-6 selection:bg-[#D4AF65]/30">
          <div className="w-full max-w-lg bg-white border border-[#D4AF65]/35 rounded-xs p-8 sm:p-12 space-y-6 shadow-xs text-left relative">
            {/* Top Forest Green Accent Rule */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#123D2A]" />

            {/* Crest & Heading */}
            <div className="space-y-4">
              <div className="w-14 h-20">
                <img
                  src="/assets/yaya-crest.png"
                  alt="RCCG YAYA Crest"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-heading font-semibold tracking-[0.2em] text-[#123D2A] uppercase">
                  RCCG YAYA Oyo Province 6 · Notice
                </p>
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#123D2A] tracking-tight">
                  A Quiet Pause in the Reading Room
                </h1>
                <div className="h-[1.5px] w-12 bg-[#D4AF65] mt-2" />
              </div>
            </div>

            <p className="text-sm text-[#252B2A]/85 leading-relaxed">
              An unexpected condition interrupted this page. Your account and reading progress remain safe. Please reload to continue.
            </p>

            {/* Subtle Scripture pull-quote in Open Sans italic */}
            <div className="p-4 bg-[#FAF8F2] border-l-2 border-[#123D2A] text-xs space-y-1">
              <p className="font-sans italic text-[#737B76]">
                &ldquo;Peace I leave with you, my peace I give unto you... Let not your heart be troubled, neither let it be afraid.&rdquo;
              </p>
              <p className="text-[10px] font-heading font-semibold text-[#123D2A] uppercase tracking-wider">
                John 14:27
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-[#123D2A] hover:bg-[#1A543A] text-white text-xs font-heading font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs min-h-[42px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-white border border-[#123D2A] hover:bg-[#EEF5F0] text-[#123D2A] text-xs font-heading font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2 cursor-pointer min-h-[42px]"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
