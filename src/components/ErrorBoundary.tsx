import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * Last-resort boundary for unexpected render errors.
 *
 * It logs the error and component stack (never plant data or form contents) and
 * offers a reload instead of leaving the user with a blank page. Recoverable
 * failures — database access, photo decoding — are handled where they occur and
 * do not reach this boundary.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  private reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="app-shell">
        <main className="crash-state" role="alert">
          <p className="eyebrow">SOMETHING WILTED</p>
          <h1>The journal could not be displayed.</h1>
          <p>
            Your saved plants are still on this device. Reloading usually fixes a
            temporary display error.
          </p>
          <button className="button button-primary" onClick={this.reload}>
            Reload the journal
          </button>
        </main>
      </div>
    )
  }
}
