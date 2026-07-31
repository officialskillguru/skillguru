import { Component, type ErrorInfo, type ReactNode } from "react";

import { routes } from "@/lib/routes";

type Props = Readonly<{ children: ReactNode; fallback?: ReactNode }>;
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, this would send to an error reporting service (e.g. Sentry)
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return <>{this.props.fallback}</>;
    }

    return (
      <div className="grid min-h-svh place-items-center bg-muted px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
            Something went wrong
          </p>
          <h1 className="mt-5 text-4xl font-black text-primary">
            Unexpected Error
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            We encountered an unexpected error. Please try refreshing the page
            or returning to the home page.
          </p>
          {this.state.error ? (
            <details className="mt-6 rounded-xl border border-border bg-white p-4 text-left">
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-3 overflow-auto text-xs text-red-600">
                {this.state.error.message}
              </pre>
            </details>
          ) : null}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-12 items-center justify-center rounded-[14px] border border-border bg-white px-6 text-sm font-bold text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-secondary"
            >
              Try Again
            </button>
            <a
              href={routes.home}
              className="inline-flex h-12 items-center justify-center rounded-[14px] bg-secondary px-6 text-sm font-bold text-white shadow-[0_18px_45px_rgba(17,71,255,0.24)] transition hover:-translate-y-0.5 hover:bg-primary"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
