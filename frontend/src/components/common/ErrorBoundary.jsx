import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SkillGap AI caught an unhandled render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-lg w-full glass-card p-8 rounded-2xl border border-destructive/30 shadow-xl space-y-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An unexpected interface error occurred during rendering. Your data is safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-muted/60 rounded-xl border border-border text-left font-mono text-[11px] text-destructive overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button onClick={this.handleReload} variant="default" className="w-full sm:w-auto gap-2">
                <RefreshCw className="h-4 w-4" /> Reload Page
              </Button>
              <Button onClick={this.handleReset} variant="outline" className="w-full sm:w-auto gap-2">
                <Home className="h-4 w-4" /> Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

