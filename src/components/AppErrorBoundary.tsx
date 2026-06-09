import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "Something went wrong while loading this screen.",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "Something went wrong while loading this screen.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App screen crashed", { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-sm">
          <h1 className="text-lg font-semibold">Screen failed to load</h1>
          <p className="mt-2 text-sm text-muted-foreground break-words">{this.state.message}</p>
          <Button className="mt-4 w-full gap-2" onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4" /> Reload
          </Button>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;