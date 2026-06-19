import { useMemo, useState, useEffect } from 'react'
import { useRealtimeTable } from '../hooks/useRealtimeTable.js'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  formatarMoeda,
  formatarData,
  mesDaData,
  anoDaData,
  rotuloMes,
  grupoStatus,
  situacaoVencimento,
  OPCOES_STATUS,
} from '../lib/format.js'
import { montarSugestoes } from '../lib/opcoes.js'
import Filters from './Filters.jsx'
import PeriodFilter from './PeriodFilter.jsx'
import FiltrosAvancados from './FiltrosAvancados.jsx'
import StatusTabs from './StatusTabs.jsx'
import SummaryCards from './SummaryCards.jsx'
import StatusBadge from './StatusBadge.jsx'
import LancamentoModal from './LancamentoModal.jsx'
import Anexos from './Anexos.jsx'

function valorBruto(registro, chave, tipo) {
  const valor = registro[chave]
  if (tipo === 'moeda') return formatarMoeda(valor)
  if (tipo === 'data') return formatarData(valor)
  if (valor === null || valor === undefined || valor === '') return '—'
  return String(valor)
}

/** Célula com valor principal + um subtexto opcional (coluna condensada). */
function Celula({ r, c }) {
  const principal = valorBruto(r, c.chave, c.tipo)
  let sub = null
  if (c.sub) {
    const sv = valorBruto(r, c.sub, c.subTipo)
    if (sv !== '—') sub = `${c.subRotulo ? c.subRotulo + ' ' : ''}${sv}`
  }
  return (
    <>
      <span
        className={
          c.tipo === 'moeda' ? 'font-semibold tabular-nums text-slate-800' : 'text-slate-800'
        }
      >
        {principal}
      </span>
      {sub && (
        <span className={`mt-0.5 block truncate text-xs ${c.subClasse || 'text-slate-400'}`}>{sub}</span>
      )}
    </>
  )
}

export default function TelaLancamentos({
  tabela,
  titulo,
  colunas,
  campos,
  statusWorkflow = true,
  campoResponsavel = 'empresa',
  comAnexos = false,
}) {
  const { registros, carregando, erro, patchLocal } = useRealtimeTable(tabela)
  const { podeEditar, ehAdmin } = useAuth()

  const [busca, setBusca] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [ordenar, setOrdenar] = useState('data')
  const [modalAberto, setModalAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState(null)
  const [verAnexos, setVerAnexos] = useState(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const statusPadrao = statusWorkflow ? 'Pendente' : 'Pago'

  const sugestoes = useMemo(() => {
    const mapa = {}
    for (const campo of campos) {
      if (campo.tipo === 'datalist') mapa[campo.nome] = montarSugestoes(campo.nome, registros)
    }
    return mapa
  }, [campos, registros])

  const anosDisponiveis = useMemo(() => {
    const set = new Set()
    for (const r of registros) {
      const a = anoDaData(r.data)
      if (a) set.add(a)
    }
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [registros])

  useEffect(() => {
    if (!filtroAno && anosDisponiveis.length > 0) setFiltroAno(anosDisponiveis[0])
  }, [anosDisponiveis, filtroAno])

  const mesesComDados = useMemo(() => {
    const set = new Set()
    for (const r of registros) {
      if (anoDaData(r.data) !== filtroAno) continue
      const m = mesDaData(r.data)
      if (m) set.add(Number(m.slice(5, 7)))
    }
    return [...set].sort((a, b) => a - b)
  }, [registros, filtroAno])

  const responsavelOpcoes = useMemo(() => {
    const set = new Set()
    for (const r of registros) {
      const v = r[campoResponsavel]
      if (v && String(v).trim()) set.add(String(v).trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [registros, campoResponsavel])

  function selecionarAno(ano) {
    setFiltroAno(ano)
    setFiltroMes('')
  }

  // Filtros que NÃO dependem do status (base para os cartões de resumo)
  const base = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const min = valorMin === '' ? null : Number(valorMin)
    const max = valorMax === '' ? null : Number(valorMax)
    return registros.filter((r) => {
      if (filtroAno && anoDaData(r.data) !== filtroAno) return false
      if (filtroMes && mesDaData(r.data) !== filtroMes) return false
      if (filtroResponsavel && String(r[campoResponsavel] ?? '') !== filtroResponsavel) return false
      const v = Number(r.valor_total) || 0
      if (min !== null && !Number.isNaN(min) && v < min) return false
      if (max !== null && !Number.isNaN(max) && v > max) return false
      const d = String(r.data ?? '').slice(0, 10)
      if (dataDe && d < dataDe) return false
      if (dataAte && d > dataAte) return false
      if (termo && !Object.values(r).join(' ').toLowerCase().includes(termo)) return false
      return true
    })
  }, [registros, busca, filtroAno, filtroMes, filtroResponsavel, valorMin, valorMax, dataDe, dataAte, campoResponsavel])

  const filtrados = useMemo(() => {
    const arr = filtroStatus ? base.filter((r) => grupoStatus(r.status) === filtroStatus) : base
    const ord = [...arr]
    if (ordenar === 'maior') ord.sort((a, b) => (Number(b.valor_total) || 0) - (Number(a.valor_total) || 0))
    else if (ordenar === 'menor') ord.sort((a, b) => (Number(a.valor_total) || 0) - (Number(b.valor_total) || 0))
    else if (ordenar === 'pagamento')
      ord.sort((a, b) => {
        // Por data de pagamento (mais próxima primeiro); sem data vai para o fim
        const da = a.data_vencimento || ''
        const db = b.data_vencimento || ''
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.localeCompare(db)
      })
    else
      ord.sort((a, b) => {
        const da = a.data ?? ''
        const db = b.data ?? ''
        if (da !== db) return db.localeCompare(da)
        return (b.id ?? 0) - (a.id ?? 0)
      })
    return ord
  }, [base, filtroStatus, ordenar])

  // Resumo (cartões): conta tudo do período, total gasto exclui reembolsados
  const resumo = useMemo(() => {
    let total = 0
    let pendentes = 0
    let enviados = 0
    let pagos = 0
    let reembolsados = 0
    for (const r of base) {
      const v = Number(r.valor_total) || 0
      const g = grupoStatus(r.status)
      if (g === 'pago') pagos += 1
      else if (g === 'enviado') enviados += 1
      else if (g === 'reembolsado') reembolsados += 1
      else pendentes += 1
      if (g !== 'reembolsado') total += v
    }
    return { total, pendentes, enviados, pagos, reembolsados, qtd: base.length }
  }, [base])

  // Agrupamento por mês com resumo (gasto líquido + quebra por status)
  const grupos = useMemo(() => {
    const map = new Map()
    for (const r of filtrados) {
      const mes = mesDaData(r.data) || 'sem-data'
      if (!map.has(mes)) map.set(mes, [])
      map.get(mes).push(r)
    }
    const arr = [...map.entries()].map(([mes, rows]) => {
      let gasto = 0
      const ps = { pendente: 0, enviado: 0, pago: 0, reembolsado: 0 }
      for (const r of rows) {
        const v = Number(r.valor_total) || 0
        const g = grupoStatus(r.status)
        ps[g] += v
        if (g !== 'reembolsado') gasto += v
      }
      return { mes, rows, count: rows.length, gasto, ps }
    })
    arr.sort((a, b) => b.mes.localeCompare(a.mes))
    return arr
  }, [filtrados])

  const totalCols = colunas.length + 1 + (podeEditar ? 1 : 0)
  const colProduto = colunas.find((c) => c.chave === 'produto')
  const algumFiltroAvancado =
    Boolean(filtroResponsavel || valorMin || valorMax || dataDe || dataAte) || ordenar !== 'data'

  function limparAvancados() {
    setFiltroResponsavel('')
    setValorMin('')
    setValorMax('')
    setDataDe('')
    setDataAte('')
    setOrdenar('data')
  }

  function mudarStatus(registro, novoStatus) {
    const anterior = registro.status
    patchLocal(registro.id, { status: novoStatus }) // resposta instantânea
    supabase
      .from(tabela)
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', registro.id)
      .then(({ error }) => {
        if (error) {
          patchLocal(registro.id, { status: anterior })
          window.alert('Não foi possível atualizar o status: ' + error.message)
        }
      })
  }

  async function excluir(registro) {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return
    await supabase.from(tabela).delete().eq('id', registro.id)
  }

  function abrirNovo() {
    setEmEdicao(null)
    setModalAberto(true)
  }
  function abrirEdicao(registro) {
    setEmEdicao(registro)
    setModalAberto(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{titulo}</h2>
          <p className="text-sm text-slate-500">
            Atualiza em tempo real para todos os usuários conectados.
          </p>
        </div>
        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-marca-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-marca-800 active:scale-95"
          >
            <span className="text-base leading-none">＋</span> Novo lançamento
          </button>
        )}
      </div>

      <SummaryCards
        totalGasto={resumo.total}
        qtdPendentes={resumo.pendentes}
        qtdEnviados={resumo.enviados}
        qtdPagos={resumo.pagos}
        qtdReembolsados={resumo.reembolsados}
        qtdTotal={resumo.qtd}
        modoSimples={!statusWorkflow}
      />

      <PeriodFilter
        anos={anosDisponiveis}
        anoAtivo={filtroAno}
        aoSelecionarAno={selecionarAno}
        mesesComDados={mesesComDados}
        mesAtivo={filtroMes}
        aoSelecionarMes={setFiltroMes}
      />

      {statusWorkflow && (
        <StatusTabs filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} resumo={resumo} />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Filters busca={busca} setBusca={setBusca} />
        </div>
        <button
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${
            algumFiltroAvancado
              ? 'border-marca-300 bg-marca-50 text-marca-700'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          ⚙️ Filtros avançados {algumFiltroAvancado && <span className="text-marca-600">•</span>}
        </button>
      </div>

      {(mostrarFiltros || algumFiltroAvancado) && (
        <FiltrosAvancados
          rotuloResponsavel="Responsável"
          responsavelOpcoes={responsavelOpcoes}
          filtroResponsavel={filtroResponsavel}
          setFiltroResponsavel={setFiltroResponsavel}
          valorMin={valorMin}
          setValorMin={setValorMin}
          valorMax={valorMax}
          setValorMax={setValorMax}
          dataDe={dataDe}
          setDataDe={setDataDe}
          dataAte={dataAte}
          setDataAte={setDataAte}
          ordenar={ordenar}
          setOrdenar={setOrdenar}
          aoLimpar={limparAvancados}
          algumAtivo={algumFiltroAvancado}
        />
      )}

      {erro && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          Erro ao carregar dados: {erro}
        </div>
      )}

      {/* ----- Tabela (desktop) ----- */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto scroll-suave">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {colunas.map((c) => (
                  <th
                    key={c.chave}
                    className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                      c.tipo === 'moeda' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {c.rotulo}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                {podeEditar && (
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan={totalCols} className="px-3 py-10 text-center text-slate-400">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="px-3 py-10 text-center text-slate-400">
                    Nenhum lançamento neste filtro. Use “＋ Novo lançamento” para adicionar.
                  </td>
                </tr>
              ) : (
                grupos.map((grupo) => (
                  <FragmentoGrupo
                    key={grupo.mes}
                    grupo={grupo}
                    colunas={colunas}
                    totalCols={totalCols}
                    podeEditar={podeEditar}
                    ehAdmin={ehAdmin}
                    statusWorkflow={statusWorkflow}
                    onStatus={mudarStatus}
                    onEditar={abrirEdicao}
                    onExcluir={excluir}
                    onVerAnexos={setVerAnexos}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----- Cartões (mobile) ----- */}
      <div className="space-y-4 md:hidden">
        {carregando ? (
          <p className="py-10 text-center text-slate-400">Carregando lançamentos...</p>
        ) : filtrados.length === 0 ? (
          <p className="py-10 text-center text-slate-400">Nenhum lançamento neste filtro.</p>
        ) : (
          grupos.map((grupo) => (
            <div key={grupo.mes} className="space-y-3">
              <div className="rounded-lg bg-slate-100/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">
                    {grupo.mes === 'sem-data' ? 'Sem data' : rotuloMes(grupo.mes)}
                  </h3>
                  <span className="text-xs font-semibold text-slate-600">
                    {grupo.count} · Gasto {formatarMoeda(grupo.gasto)}
                  </span>
                </div>
                <ResumoMes ps={grupo.ps} />
              </div>
              {grupo.rows.map((r) => {
                const s = situacaoVencimento(r.status, r.data_vencimento)
                const subProduto =
                  colProduto?.sub ? valorBruto(r, colProduto.sub, colProduto.subTipo) : null
                return (
                  <div
                    key={r.id}
                    onClick={() => podeEditar && abrirEdicao(r)}
                    className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${s.classeLinha} ${r.prioridade ? 'border-l-4 border-l-red-500' : ''} ${podeEditar ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {r.prioridade && (
                          <span className="mb-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
                            🔴 Urgente
                          </span>
                        )}
                        <p className="font-semibold text-slate-800">{r.produto || '—'}</p>
                        {subProduto && subProduto !== '—' && (
                          <p className="truncate text-xs text-slate-400">{subProduto}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={r.status} dataVencimento={r.data_vencimento} />
                        {Array.isArray(r.anexos) && r.anexos.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setVerAnexos(r)
                            }}
                            className="rounded-md px-2 py-0.5 text-xs font-semibold text-marca-700 hover:bg-marca-50"
                          >
                            📎 {r.anexos.length}
                          </button>
                        )}
                      </div>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      {colunas
                        .filter((c) => c.chave !== 'produto')
                        .map((c) => (
                          <div key={c.chave} className="min-w-0">
                            <dt className="text-xs text-slate-400">{c.rotulo}</dt>
                            <dd>
                              <Celula r={r} c={c} />
                            </dd>
                          </div>
                        ))}
                    </dl>
                    {podeEditar && (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                        {statusWorkflow && (
                          <select
                            value={r.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => mudarStatus(r, e.target.value)}
                            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium outline-none focus:border-marca-600"
                          >
                            {OPCOES_STATUS.map((op) => (
                              <option key={op} value={op}>
                                {op}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirEdicao(r)
                          }}
                          className="rounded-lg bg-marca-50 px-3 py-2 text-xs font-semibold text-marca-700 hover:bg-marca-100 active:scale-95"
                        >
                          Editar
                        </button>
                        {ehAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              excluir(r)
                            }}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 active:scale-95"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {podeEditar && (
        <LancamentoModal
          aberto={modalAberto}
          aoFechar={() => setModalAberto(false)}
          tabela={tabela}
          titulo={titulo + ' · novo lançamento'}
          campos={campos}
          registro={emEdicao}
          statusPadrao={statusPadrao}
          sugestoes={sugestoes}
          comAnexos={comAnexos}
        />
      )}

      {/* Visualizador de anexos (todos os usuários logados) */}
      {verAnexos && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
          onClick={() => setVerAnexos(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">📎 Anexos do pedido</h2>
              <button
                onClick={() => setVerAnexos(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 truncate text-sm text-slate-500">{verAnexos.produto}</p>
            <Anexos
              tabela={tabela}
              registroId={verAnexos.id}
              anexosIniciais={verAnexos.anexos}
              podeEditar={podeEditar}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Linha com a quebra de valores por status do mês (só mostra os não-zero). */
function ResumoMes({ ps }) {
  const itens = []
  if (ps.pendente > 0) itens.push(['Pendente', formatarMoeda(ps.pendente), 'text-amber-600'])
  if (ps.enviado > 0) itens.push(['Enviado', formatarMoeda(ps.enviado), 'text-blue-600'])
  if (ps.pago > 0) itens.push(['Pago', formatarMoeda(ps.pago), 'text-emerald-600'])
  if (ps.reembolsado > 0) itens.push(['Reembolsado', formatarMoeda(ps.reembolsado), 'text-violet-600'])
  if (itens.length === 0) return null
  return (
    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
      {itens.map(([rot, val, cor]) => (
        <span key={rot} className={cor}>
          {rot} {val}
        </span>
      ))}
    </div>
  )
}

function FragmentoGrupo({
  grupo,
  colunas,
  totalCols,
  podeEditar,
  ehAdmin,
  statusWorkflow,
  onStatus,
  onEditar,
  onExcluir,
  onVerAnexos,
}) {
  return (
    <>
      <tr className="bg-slate-100/70">
        <td colSpan={totalCols} className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              {grupo.mes === 'sem-data' ? 'Sem data' : rotuloMes(grupo.mes)}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {grupo.count} itens · Gasto {formatarMoeda(grupo.gasto)}
            </span>
          </div>
          <ResumoMes ps={grupo.ps} />
        </td>
      </tr>
      {grupo.rows.map((r) => {
        const s = situacaoVencimento(r.status, r.data_vencimento)
        const corSel =
          {
            pendente: 'border-amber-300 bg-amber-50 text-amber-800',
            enviado: 'border-blue-300 bg-blue-50 text-blue-800',
            pago: 'border-emerald-300 bg-emerald-50 text-emerald-800',
            reembolsado: 'border-violet-300 bg-violet-50 text-violet-800',
          }[grupoStatus(r.status)] || 'border-slate-200 bg-white'
        return (
          <tr
            key={r.id}
            onClick={() => podeEditar && onEditar(r)}
            className={`${s.classeLinha} ${r.prioridade ? 'border-l-4 border-red-500' : ''} ${
              podeEditar ? 'cursor-pointer' : ''
            } transition hover:bg-marca-50/40`}
          >
            {colunas.map((c) => (
              <td
                key={c.chave}
                className={`px-3 py-3 align-middle ${c.className ?? ''} ${
                  c.tipo === 'moeda' ? 'whitespace-nowrap text-right' : ''
                }`}
              >
                <Celula r={r} c={c} />
              </td>
            ))}
            <td className="px-3 py-3 align-middle">
              {r.prioridade && (
                <span className="mb-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
                  🔴 Urgente
                </span>
              )}
              {podeEditar && statusWorkflow ? (
                <select
                  value={r.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onStatus(r, e.target.value)}
                  className={`block w-full rounded-lg border px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-marca-100 ${corSel}`}
                >
                  {OPCOES_STATUS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={r.status} dataVencimento={r.data_vencimento} />
              )}
              {Array.isArray(r.anexos) && r.anexos.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onVerAnexos(r)
                  }}
                  className="mt-1 block rounded-md px-2 py-1 text-xs font-semibold text-marca-700 hover:bg-marca-50"
                >
                  📎 {r.anexos.length}
                </button>
              )}
            </td>
            {podeEditar && (
              <td className="whitespace-nowrap px-3 py-3 text-right align-middle">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditar(r)
                    }}
                    className="rounded-lg bg-marca-50 px-3 py-2 text-xs font-semibold text-marca-700 transition hover:bg-marca-100 active:scale-95"
                  >
                    Editar
                  </button>
                  {ehAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExcluir(r)
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 active:scale-95"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        )
      })}
    </>
  )
}
