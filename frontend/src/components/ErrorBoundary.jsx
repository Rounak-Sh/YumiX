import React from "react";
import { showToast } from "@/utils/toast";

/**
 * Error Boundary Component
 *
 * Captures JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component
 * tree that crashed
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    // Save error info for rendering
    this.setState({
      errorInfo: errorInfo,
    });

    // Show a toast notification
    showToast.error("Something went wrong. The error has been logged.");

    // Could also log to an error reporting service here
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="text-center p-6 bg-white rounded-lg shadow-lg mx-auto max-w-md mt-10">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Something went wrong
          </h2>

          <p className="mb-4 text-gray-700">
            The application encountered an unexpected error. Try refreshing the
            page.
          </p>

          {this.props.showReset && (
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all">
              Try Again
            </button>
          )}

          {this.state.error && this.props.showDetails && (
            <details className="mt-4 text-left bg-gray-100 p-3 rounded">
              <summary className="cursor-pointer font-semibold">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-gray-200 rounded overflow-x-auto text-xs">
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

ErrorBoundary.defaultProps = {
  showReset: true,
  showDetails: process.env.NODE_ENV === "development",
};

export default ErrorBoundary;
