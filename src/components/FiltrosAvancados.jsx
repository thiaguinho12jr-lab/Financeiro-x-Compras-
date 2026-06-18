/**
 * Filtros avançados: responsável (PF), faixa de valor, intervalo de datas e ordenação.
 */
export default function FiltrosAvancados({
  rotuloResponsavel = 'Responsável',
  responsavelOpcoes,
  filtroResponsavel,
  setFiltroResponsavel,
  valorMin,
  setValorMin,
  valorMax,
  setValorMax,
  dataDe,
  setDataDe,
  dataAte,
  setDataAte,
  ordenar,
  setOrdenar,
  aoLimpar,
  algumAtivo,
}) {
  const campo =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-marca-600 focus:ring-2 focus:ring-marca-100'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {rotuloResponsavel} (PF/CNPJ)
          </label>
          <select
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className={campo}
          >
            <option value="">Todos</option>
            {responsavelOpcoes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Valor (R$)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              placeholder="mín"
              className={`${campo} w-24`}
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              inputMode="decimal"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              placeholder="máx"
              className={`${campo} w-24`}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Data
          </label>
          <div className="flex items-center gap-1">
            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className={campo} />
            <span className="text-slate-400">–</span>
            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className={campo} />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Ordenar por
          </label>
          <select value={ordenar} onChange={(e) => setOrdenar(e.target.value)} className={campo}>
            <option value="data">Data (mais recente)</option>
            <option value="maior">Maior valor</option>
            <option value="menor">Menor valor</option>
          </select>
        </div>

        {algumAtivo && (
          <button
            type="button"
            onClick={aoLimpar}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 active:scale-95"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
