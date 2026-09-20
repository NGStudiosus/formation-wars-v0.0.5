import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ResearchErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ResearchErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ResearchErrorBoundary extends React.Component<
  ResearchErrorBoundaryProps,
  ResearchErrorBoundaryState
> {
  constructor(props: ResearchErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ResearchErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Critical Research Archive Render Exception Detected:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: ResearchErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  public componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.state.hasError && (e.key === 'Escape' || e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      e.stopPropagation();
      this.handleDismiss();
    }
  };

  public handleDismiss = () => {
    this.setState({ hasError: false, error: null });
    this.props.onClose();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="research-error-boundary-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none"
        >
          <div className="p-4 border border-red-500 bg-black/90 text-red-400 font-mono text-xs max-w-md w-full rounded shadow-[0_0_40px_rgba(255,0,0,0.4)]">
            <div className="font-bold tracking-wider mb-1">
              CRITICAL: RESEARCH ARCHIVE RENDER EXCEPTION DETECTED.
            </div>
            {this.state.error?.message && (
              <div className="text-[10px] text-red-300/80 mb-2 break-all opacity-80">
                {this.state.error.message}
              </div>
            )}
            <button
              type="button"
              id="btn-dismiss-research-error"
              onClick={this.handleDismiss}
              className="mt-2 px-2 py-1 bg-red-900 hover:bg-red-800 text-white rounded cursor-pointer transition font-bold"
            >
              DISMISS [ESC]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
