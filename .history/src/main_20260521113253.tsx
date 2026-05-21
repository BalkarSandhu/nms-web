import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store'
import './index.css'
import App from './App.tsx'
import { OverviewModeProvider } from './contexts/OverviewModeContext'
import { AreaViewProvider } from './contexts/AreaViewContext'
import { HistoryRangeProvider } from './contexts/HistoryRangeContext'
import { HistoryNavProvider } from './contexts/HistoryNavContext'
import { HistoryViewProvider } from './contexts/HistoryViewContext'
import { RefreshProvider } from './contexts/RefreshContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <RefreshProvider>
          <OverviewModeProvider>
            <AreaViewProvider>
              <HistoryRangeProvider>
                <HistoryNavProvider>
                  <HistoryViewProvider>
                    <App />
                  </HistoryViewProvider>
                </HistoryNavProvider>
              </HistoryRangeProvider>
            </AreaViewProvider>
          </OverviewModeProvider>
        </RefreshProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
