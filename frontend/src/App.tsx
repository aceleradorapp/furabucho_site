import { useEffect, useState } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    fetch('http://localhost:4321/api/health')
      .then((res) => (res.ok ? setApiStatus('online') : setApiStatus('offline')))
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div className="min-h-svh bg-canvas flex items-center justify-center p-4 md:p-10">
      <div className="w-full max-w-7xl bg-card rounded-card md:rounded-card-lg shadow-2xl px-6 py-8 md:px-10 md:py-10">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span className="font-semibold text-text-main">Amigos Fura-Bucho</span>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full ${
              apiStatus === 'online'
                ? 'bg-green-100 text-green-700'
                : apiStatus === 'offline'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            API: {apiStatus}
          </span>
        </header>

        <h1 className="font-display uppercase tracking-wider text-4xl md:text-6xl text-center text-text-main">
          Tradição, Risadas &amp; União
        </h1>
        <p className="text-center text-text-muted mt-4">
          Portal em construção — landing page, área de membros e feed a caminho.
        </p>
      </div>
    </div>
  )
}

export default App
