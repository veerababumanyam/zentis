import React, { type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * App-level Error Boundary — catches uncaught render errors and displays
 * a recovery UI instead of a white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = { hasError: false, error: null };
    public readonly props: Props;

    constructor(props: Props) {
        super(props);
        this.props = props;
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617] p-8">
                    <div className="max-w-md text-center space-y-6">
                        <div className="text-5xl">⚠️</div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            An unexpected error occurred. Your data is safe — try reloading the page.
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto max-h-32 text-red-600 dark:text-red-400">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
