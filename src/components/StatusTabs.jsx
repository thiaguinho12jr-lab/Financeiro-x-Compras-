/**
 * Pílulas de filtro por status (como na Visão geral), para a tela principal.
 * Ligadas ao mesmo `filtroStatus` dos cartões.
 */
export default function StatusTabs({ filtroStatus, setFiltroStatus, resumo }) {
  const itens = [
    { chave: '', rotulo: 'Todos', qtd: resumo.qtd, ativo: 'bg-slate-800 text-white' },
    { chave: 'pendente', rotulo: 'Pendentes', qtd: resumo.pendentes, ativo: 'bg-amber-500 text-white' },
    { chave: 'enviado', rotulo: 'Enviado p/ pagamento', qtd: resumo.enviados, ativo: 'bg-blue-600 text-white' },
    { chave: 'pago', rotulo: 'Pagos', qtd: resumo.pagos, ativo: 'bg-emerald-600 text-white' },
  ]
  if (resumo.reembolsados > 0) {
    itens.push({
      chave: 'reembolsado',
      rotulo: 'Reembolsados',
      qtd: resumo.reembolsados,
      ativo: 'bg-violet-600 text-white',
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {itens.map((i) => {
        const ativo = filtroStatus === i.chave
        return (
          <button
            key={i.chave || 'todos'}
            type="button"
            onClick={() => setFiltroStatus(i.chave)}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
              ativo
                ? i.ativo + ' shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {i.rotulo} <span className={ativo ? 'opacity-90' : 'text-slate-400'}>({i.qtd})</span>
          </button>
        )
      })}
    </div>
  )
}
