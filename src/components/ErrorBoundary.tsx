import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            خطایی رخ داد
          </h2>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            متأسفانه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <div className="bg-card border border-border rounded-lg p-4 mb-6 max-w-md w-full">
              <p className="text-sm text-destructive font-mono break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
            <Button variant="default" onClick={this.handleReload}>
              بارگذاری مجدد صفحه
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
