import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ConfirmDialogProvider } from './components/ConfirmDialogProvider'
import { UpdateToast } from './components/UpdateToast'
import { ThemeProvider } from './theme/ThemeContext'
import './index.css'
// Efeito colateral: registra o service worker com atualização automática (ver src/pwa.ts).
// Precisa rodar antes de qualquer coisa, então fica direto no ponto de entrada do app.
import './pwa'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <App />
          </ConfirmDialogProvider>
        </AuthProvider>
        <UpdateToast />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
