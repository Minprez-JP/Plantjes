import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isNativeMobilePlatform } from './lib/platform'
// @ts-ignore CSS side-effect imports may not have declarations in this project.
import './styles.css'
// @ts-ignore CSS side-effect imports may not have declarations in this project.
import './mobile.css'

if (isNativeMobilePlatform()) {
  // The light shell draws under the system bars, so their icons need to be dark.
  void SystemBars.setStyle({ style: SystemBarsStyle.Light }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
