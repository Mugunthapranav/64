import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary component to catch and handle React render errors
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });

        // Call optional onError callback
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">
                            <span role="img" aria-label="warning">⚠️</span>
                        </div>
                        <h2>Something went wrong</h2>
                        <p className="error-message">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button className="retry-button" onClick={this.handleRetry}>
                            Try Again
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="error-details">
                                <summary>Technical Details</summary>
                                <pre>{this.state.error?.stack}</pre>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
