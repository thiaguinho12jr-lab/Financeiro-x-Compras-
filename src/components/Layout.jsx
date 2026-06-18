import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function linkClasse({ isActive }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-white/15 text-white shadow-sm'
      : 'text-marca-100/80 hover:bg-white/10 hover:text-white',
  ].join(' ')
}

export default function Layout({ children }) {
  const { ehAdmin, sair } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  async function aoSair() {
    await sair()
    navigate('/')
  }

  const links = [
    { to: '/visao-geral', rotulo: 'Visão geral', icone: '📊' },
    { to: '/solicitacoes', rotulo: 'Solicitações', icone: '🧾' },
    { to: '/fundo-caixa', rotulo: 'Fundo de Caixa', icone: '💵' },
    ...(ehAdmin ? [{ to: '/historico', rotulo: 'Histórico', icone: '🕑' }] : []),
    ...(ehAdmin ? [{ to: '/usuarios', rotulo: 'Usuários', icone: '👥' }] : []),
  ]

  const conteudoSidebar = (
    <aside className="flex h-full w-64 flex-col bg-gradient-to-b from-marca-900 to-slate-900 text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <span className="text-2xl">💰</span>
        <div>
          <h1 className="text-sm font-bold leading-tight">Financeiro · Compras</h1>
          <p className="text-xs text-marca-100/60">Painel de pagamentos</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={linkClasse} onClick={() => setMenuAberto(false)}>
            <span className="text-base leading-none">{l.icone}</span>
            {l.rotulo}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={aoSair}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-marca-100/80 transition hover:bg-white/10 hover:text-white"
        >
          <span className="text-base leading-none">⎋</span>
          Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar fixa (desktop) */}
      <div className="sticky top-0 hidden h-screen shrink-0 md:block">{conteudoSidebar}</div>

      {/* Drawer (mobile) */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuAberto(false)} />
          <div className="absolute left-0 top-0 h-full shadow-2xl">{conteudoSidebar}</div>
        </div>
      )}

      {/* Área de conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior só no mobile (com botão de menu) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-1.5 text-2xl leading-none text-slate-600 hover:bg-slate-100"
          >
            ☰
          </button>
          <span className="text-xl">💰</span>
          <h1 className="text-sm font-bold text-slate-800">Financeiro · Compras</h1>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
