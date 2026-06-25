import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRealtimeTable } from '../hooks/useRealtimeTable.js'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  formatarMoeda,
  formatarData,
  hojeISO,
  grupoStatus,
  situacaoVencimento,
  alertaVencimento,
  pendenciasPagamento,
  pedidoCompleto,
  OPCOES_STATUS,
} from '../lib/format.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { montarSugestoes } from '../lib/opcoes.js'
import { CAMPOS_SOLICITACOES } from '../lib/camposConfig.js'
import StatusBadge from '../components/StatusBadge.jsx'
import LancamentoModal from '../components/LancamentoModal.jsx'
import RelatorioMensal from '../components/RelatorioMensal.jsx'

function resumirPorStatus(registros) {
  const r = {
    pendente: { qtd: 0, total: 0 },
    enviado: { qtd: 0, total: 0 },
    pago: { qtd: 0, total: 0 },
    geral: { qtd: registros.length, total: 0 },
  }
  for (const reg of registros) {
    const v = Number(reg.valor_total) || 0
    const g = grupoStatus(reg.status)
    r[g].qtd += 1
    r[g].total += v
    r.geral.total += v
  }
  return r
}

function ordenarUrgentes(lista) {
  return [...lista].sort((a, b) => (b.prioridade ? 1 : 0) - (a.prioridade ? 1 : 0))
}

function prefixoQtd(r) {
  const q = Number(r.quantidade)
  return !Number.isNaN(q) && q > 0 ? `${q}x ` : ''
}

function linhaItemWhats(r, i) {
  let s = `${i}. ${r.prioridade ? '🔴 ' : ''}*${prefixoQtd(r)}${r.produto || 'Pedido'}* — *${formatarMoeda(r.valor_total)}*`
  if (r.codigo_glpi) s += `  🔖 ${r.codigo_glpi}`
  return s
}

// Bloco padrão explicando o que o financeiro precisa definir.
function blocoFalta() {
  return [
    '⚠️ *Faltam definir as informações para os pedidos:*',
    '• *CPF/CNPJ* para emissão da nota fiscal',
    '• *Data de pagamento*',
  ]
}

function Cartao({ titulo, valor, detalhe, cor, anel }) {
  return (
    <div className={`rounded-2xl border-2 ${anel} bg-white p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-2 text-2xl font-extrabold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </div>
  )
}

const ABAS = [
  { chave: 'pendente', rotulo: 'Pendentes', ativo: 'bg-amber-500 text-white' },
  { chave: 'enviado', rotulo: 'Enviado p/ pagamento', ativo: 'bg-blue-600 text-white' },
  { chave: 'pago', rotulo: 'Pagos', ativo: 'bg-emerald-600 text-white' },
]

export default function Painel() {
  const sol = useRealtimeTable('solicitacoes')
  const fun = useRealtimeTable('fundo_caixa')
  const { podeEditar, perfil } = useAuth()

  const [aba, setAba] = useState('pendente')
  const [subPendente, setSubPendente] = useState('todos') // 'todos' | 'prontos' | 'falta'
  const [vista, setVista] = useState('pedidos') // 'pedidos' | 'relatorio'
  const [emEdicao, setEmEdicao] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)

  const carregando = sol.carregando || fun.carregando

  const rSol = useMemo(() => resumirPorStatus(sol.registros), [sol.registros])
  const rFun = useMemo(() => resumirPorStatus(fun.registros), [fun.registros])

  const sugestoes = useMemo(() => {
    const mapa = {}
    for (const campo of CAMPOS_SOLICITACOES) {
      if (campo.tipo === 'datalist') mapa[campo.nome] = montarSugestoes(campo.nome, sol.registros)
    }
    return mapa
  }, [sol.registros])

  const comb = useMemo(() => {
    const soma = (a, b) => ({ qtd: a.qtd + b.qtd, total: a.total + b.total })
    return {
      geral: soma(rSol.geral, rFun.geral),
      pendente: soma(rSol.pendente, rFun.pendente),
      enviado: soma(rSol.enviado, rFun.enviado),
      pago: soma(rSol.pago, rFun.pago),
    }
  }, [rSol, rFun])

  // Pedidos (Solicitações) agrupados por status
  const porStatus = useMemo(() => {
    const g = { pendente: [], enviado: [], pago: [] }
    for (const r of sol.registros) g[grupoStatus(r.status)].push(r)
    return g
  }, [sol.registros])

  // Definição financeira (entre os pendentes)
  const definicao = useMemo(() => {
    const def = { qtd: 0, total: 0 }
    const falta = { qtd: 0, total: 0 }
    for (const r of porStatus.pendente) {
      const v = Number(r.valor_total) || 0
      if (pedidoCompleto(r)) {
        def.qtd += 1
        def.total += v
      } else {
        falta.qtd += 1
        falta.total += v
      }
    }
    return { def, falta }
  }, [porStatus])

  // Lista da aba selecionada (pendentes: "falta definir" primeiro)
  const lista = useMemo(() => {
    let arr = [...porStatus[aba]]
    if (aba === 'pendente') {
      if (subPendente === 'prontos') arr = arr.filter((r) => pedidoCompleto(r))
      else if (subPendente === 'falta') arr = arr.filter((r) => !pedidoCompleto(r))
      arr.sort((a, b) => {
        const ua = a.prioridade ? 1 : 0
        const ub = b.prioridade ? 1 : 0
        if (ua !== ub) return ub - ua // urgentes primeiro
        const pa = pedidoCompleto(a) ? 1 : 0
        const pb = pedidoCompleto(b) ? 1 : 0
        if (pa !== pb) return pa - pb
        return (a.data_vencimento || a.data || '').localeCompare(b.data_vencimento || b.data || '')
      })
    } else {
      arr.sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    }
    return arr
  }, [porStatus, aba, subPendente])

  function abrirDefinicao(registro) {
    if (!podeEditar) return
    setEmEdicao(registro)
    setModalAberto(true)
  }

  function mudarStatus(registro, novoStatus) {
    const anterior = registro.status
    sol.patchLocal(registro.id, { status: novoStatus }) // resposta instantânea
    supabase
      .from('solicitacoes')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', registro.id)
      .then(({ error }) => {
        if (error) {
          sol.patchLocal(registro.id, { status: anterior })
          window.alert('Não foi possível atualizar: ' + error.message)
        }
      })
  }

  function abrirWhats(msg) {
    window.open(linkWhatsApp(msg), '_blank', 'noopener')
  }

  // Mensagem 1: resumo
  function msgResumo() {
    const nome = perfil?.nome?.trim() || 'Equipe de Compras'
    const pend = porStatus.pendente
    const totalValor = pend.reduce((s, r) => s + (Number(r.valor_total) || 0), 0)
    const faltam = ordenarUrgentes(pend.filter((r) => !pedidoCompleto(r)))

    const l = []
    l.push('*💰 FINANCEIRO · COMPRAS*')
    l.push(`_${formatarData(hojeISO())} · por ${nome}_`)
    l.push('')
    l.push(`📌 *${pend.length} pedidos pendentes* — total *${formatarMoeda(totalValor)}*`)
    if (faltam.length) {
      l.push('')
      faltam.slice(0, 30).forEach((r, i) => l.push(linhaItemWhats(r, i + 1)))
      if (faltam.length > 30) l.push(`_...e mais ${faltam.length - 30} pedido(s)_`)
      l.push('')
      l.push(...blocoFalta())
    }
    l.push('')
    l.push('Podem revisar e dar andamento, por favor? 🙏')
    return l.join('\n')
  }

  if (carregando) {
    return <p className="py-10 text-center text-slate-400">Carregando visão geral...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Visão geral</h2>
          <p className="text-sm text-slate-500 txt-canvas-muted">
            Tudo o que está pendente, enviado e pago — Solicitações e Fundo de Caixa juntos.
          </p>
        </div>
        {podeEditar && (
          <button
            onClick={() => abrirWhats(msgResumo())}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          >
            <span className="text-base leading-none">📲</span> Avisar no WhatsApp (resumo)
          </button>
        )}
      </div>

      {/* Sub-tópicos da Visão geral */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setVista('pedidos')}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
            vista === 'pedidos'
              ? 'bg-marca-700 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          ].join(' ')}
        >
          📋 Pedidos
        </button>
        <button
          type="button"
          onClick={() => setVista('relatorio')}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
            vista === 'relatorio'
              ? 'bg-marca-700 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          ].join(' ')}
        >
          📊 Relatório mensal
        </button>
      </div>

      {vista === 'relatorio' ? (
        <RelatorioMensal registrosSol={sol.registros} registrosFun={fun.registros} />
      ) : (
        <>
      {/* Indicadores (separados, sem misturar pago com pendente) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cartao
          titulo="Pendente a pagar"
          valor={formatarMoeda(comb.pendente.total)}
          detalhe={`${comb.pendente.qtd} aguardando`}
          cor="text-amber-600"
          anel="border-amber-200"
        />
        <Cartao
          titulo="Enviado"
          valor={formatarMoeda(comb.enviado.total)}
          detalhe={`${comb.enviado.qtd} enviado(s)`}
          cor="text-blue-600"
          anel="border-blue-200"
        />
        <Cartao
          titulo="Pago"
          valor={formatarMoeda(comb.pago.total)}
          detalhe={`${comb.pago.qtd} quitado(s)`}
          cor="text-emerald-600"
          anel="border-emerald-200"
        />
      </div>

      {/* Pedidos separados por status (abas) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Pedidos (Solicitações)</h3>
          <Link to="/solicitacoes" className="text-sm font-semibold text-marca-700 hover:underline">
            Abrir tela completa →
          </Link>
        </div>

        {/* Abas de status */}
        <div className="mb-3 flex flex-wrap gap-2">
          {ABAS.map((a) => {
            const qtd = porStatus[a.chave].length
            const ativo = aba === a.chave
            return (
              <button
                key={a.chave}
                type="button"
                onClick={() => setAba(a.chave)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95',
                  ativo ? a.ativo + ' shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                {a.rotulo} <span className={ativo ? 'opacity-90' : 'text-slate-400'}>({qtd})</span>
              </button>
            )
          })}
        </div>

        {aba === 'pendente' && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {[
              { k: 'todos', r: `Todos (${porStatus.pendente.length})` },
              { k: 'prontos', r: `✅ Prontos p/ enviar (${definicao.def.qtd})` },
              { k: 'falta', r: `⏳ Falta definir (${definicao.falta.qtd})` },
            ].map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => setSubPendente(s.k)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95',
                  subPendente === s.k
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                {s.r}
              </button>
            ))}
          </div>
        )}

        {lista.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            Nenhum pedido nesta situação.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto scroll-suave">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Produto</th>
                    <th className="px-3 py-3 text-center font-semibold">Qtd</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor total</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor unit.</th>
                    <th className="px-4 py-3 text-right font-semibold">Frete</th>
                    <th className="px-4 py-3 font-semibold">Motivo</th>
                    <th className="px-4 py-3 font-semibold">Centro de custo</th>
                    <th className="px-4 py-3 font-semibold">Local de entrega</th>
                    <th className="px-4 py-3 font-semibold">Fornecedor</th>
                    <th className="px-4 py-3 font-semibold">Cidade/UF</th>
                    <th className="px-4 py-3 font-semibold">Forma de pagamento</th>
                    <th className="px-4 py-3 font-semibold">Pago por (PF/CNPJ)</th>
                    <th className="px-4 py-3 font-semibold">Data de pagamento</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 text-center font-semibold">Urgência</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <LinhaPedido
                      key={r.id}
                      r={r}
                      aba={aba}
                      podeEditar={podeEditar}
                      onClick={() => abrirDefinicao(r)}
                      onStatus={(novo) => mudarStatus(r, novo)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {podeEditar && (
        <LancamentoModal
          aberto={modalAberto}
          aoFechar={() => setModalAberto(false)}
          tabela="solicitacoes"
          titulo="Definir pagamento"
          campos={CAMPOS_SOLICITACOES}
          registro={emEdicao}
          sugestoes={sugestoes}
          comAnexos
        />
      )}
    </div>
  )
}

const COR_STATUS_SELECT = {
  pendente: 'bg-amber-50 text-amber-700 ring-amber-200',
  enviado: 'bg-blue-50 text-blue-700 ring-blue-200',
  pago: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reembolsado: 'bg-violet-50 text-violet-700 ring-violet-200',
}

/** Célula de texto da planilha: mostra "—" discreto quando vazio. */
function Cel({ valor, classe = 'text-slate-600', max = '12rem' }) {
  if (valor === null || valor === undefined || valor === '' || valor === '-')
    return <span className="text-slate-300">—</span>
  return (
    <span className={`block truncate ${classe}`} style={{ maxWidth: max }} title={String(valor)}>
      {valor}
    </span>
  )
}

/** Linha da tabela de pedidos — espelha as colunas da planilha (Excel). */
function LinhaPedido({ r, aba, podeEditar, onClick, onStatus }) {
  const pagoPor = r.empresa || r.cnpj_cpf
  const moeda = (v) =>
    v === null || v === undefined || v === '' ? <span className="text-slate-300">—</span> : formatarMoeda(v)

  return (
    <tr
      onClick={podeEditar ? onClick : undefined}
      className={[
        'border-b border-slate-100 align-middle transition last:border-0',
        podeEditar ? 'cursor-pointer hover:bg-slate-50' : '',
        r.prioridade ? 'bg-red-50/50' : '',
      ].join(' ')}
    >
      {/* Data */}
      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatarData(r.data)}</td>

      {/* Produto */}
      <td className="px-4 py-3">
        <span className="block max-w-[18rem] truncate font-semibold text-marca-700" title={r.produto || ''}>
          {r.produto || '—'}
        </span>
      </td>

      {/* Quantidade */}
      <td className="whitespace-nowrap px-3 py-3 text-center tabular-nums text-slate-600">
        {Number(r.quantidade) > 0 ? r.quantidade : <span className="text-slate-300">—</span>}
      </td>

      {/* Valor total */}
      <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-800">
        {moeda(r.valor_total)}
      </td>

      {/* Valor unitário */}
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
        {moeda(r.valor_unitario)}
      </td>

      {/* Frete */}
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
        {moeda(r.frete)}
      </td>

      {/* Motivo */}
      <td className="px-4 py-3">
        <Cel valor={r.motivo} max="18rem" />
      </td>

      {/* Centro de custo */}
      <td className="px-4 py-3">
        <Cel valor={r.centro_custo} max="10rem" />
      </td>

      {/* Local de entrega */}
      <td className="px-4 py-3">
        <Cel valor={r.local_entrega} max="10rem" />
      </td>

      {/* Fornecedor */}
      <td className="px-4 py-3">
        <Cel valor={r.fornecedor} max="10rem" />
      </td>

      {/* Cidade/UF */}
      <td className="px-4 py-3">
        <Cel valor={r.cidade_estado} max="9rem" />
      </td>

      {/* Forma de pagamento */}
      <td className="whitespace-nowrap px-4 py-3">
        {r.forma_pagamento ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {r.forma_pagamento}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>

      {/* Pago por (PF/CNPJ) */}
      <td className="whitespace-nowrap px-4 py-3">
        {pagoPor ? (
          <span className="text-slate-700">{pagoPor}</span>
        ) : (
          <span className="font-medium text-red-500">a definir</span>
        )}
      </td>

      {/* Data de pagamento */}
      <td className="whitespace-nowrap px-4 py-3">
        {r.data_vencimento ? (
          <span className="font-medium text-blue-600">{formatarData(r.data_vencimento)}</span>
        ) : (
          <span className="font-medium text-red-500">a definir</span>
        )}
      </td>

      {/* Status (dropdown, como na planilha) */}
      <td className="whitespace-nowrap px-4 py-3">
        <select
          value={OPCOES_STATUS.includes(r.status) ? r.status : 'Pendente'}
          disabled={!podeEditar}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatus(e.target.value)}
          className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 focus:outline-none focus:ring-2 ${
            COR_STATUS_SELECT[grupoStatus(r.status)] || 'bg-slate-50 text-slate-600 ring-slate-200'
          } ${podeEditar ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {OPCOES_STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>

      {/* Urgência */}
      <td className="whitespace-nowrap px-3 py-3 text-center">
        {r.prioridade ? (
          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
            SIM
          </span>
        ) : (
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100">
            NÃO
          </span>
        )}
      </td>
    </tr>
  )
}
