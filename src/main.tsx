import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store'
import './index.css'
import App from './App.tsx'
import { OverviewModeProvider } from './contexts/OverviewModeContext'
import { AreaViewProvider } from './contexts/AreaViewContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <OverviewModeProvider>
          <AreaViewProvider>
            <App />
          </AreaViewProvider>
        </OverviewModeProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
