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
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {lista.map((r) => (
              <PedidoItem
                key={r.id}
                r={r}
                aba={aba}
                podeEditar={podeEditar}
                onClick={() => abrirDefinicao(r)}
                onStatus={(novo) => mudarStatus(r, novo)}
              />
            ))}
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

/** Linha rótulo + valor da ficha do pedido. Mostra "—" quando vazio. */
function Campo({ rotulo, valor, faltando, destaque }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{rotulo}</dt>
      <dd
        className={[
          'break-words text-[13px] font-medium',
          faltando ? 'text-red-500' : destaque ? 'text-blue-700' : valor ? 'text-slate-700' : 'text-slate-300',
        ].join(' ')}
      >
        {valor || (faltando ? 'a definir' : '—')}
      </dd>
    </div>
  )
}

/** Cartão corporativo: cabeçalho, ficha completa de informações e rodapé de ação. */
function PedidoItem({ r, aba, podeEditar, onClick, onStatus }) {
  const falta = pendenciasPagamento(r)
  const pronto = falta.length === 0
  const g = grupoStatus(r.status)
  const alerta = alertaVencimento(r)
  const faltaPfCnpj = !r.empresa && !r.cnpj_cpf
  const faltaData = !r.data_vencimento
  const corBorda = r.prioridade
    ? 'border-l-[3px] border-l-red-500'
    : {
        pendente: 'border-l-[3px] border-l-amber-400',
        enviado: 'border-l-[3px] border-l-blue-500',
        pago: 'border-l-[3px] border-l-emerald-500',
        reembolsado: 'border-l-[3px] border-l-violet-400',
      }[g] || 'border-l-[3px] border-l-slate-200'

  return (
    <div
      onClick={podeEditar ? onClick : undefined}
      role={podeEditar ? 'button' : undefined}
      className={[
        'flex h-full flex-col rounded-xl border border-slate-200 bg-white text-left shadow-sm',
        corBorda,
        podeEditar ? 'cursor-pointer transition hover:border-slate-300 hover:shadow-md active:scale-[0.995]' : '',
      ].join(' ')}
    >
      {/* Cabeçalho: produto + valor + status */}
      <div className="border-b border-slate-100 px-4 pb-3 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-slate-900">
            {r.prioridade && <span className="mr-1 align-middle text-red-600">🔴</span>}
            {r.produto || '—'}
          </p>
          <p className="whitespace-nowrap text-lg font-extrabold tabular-nums text-slate-900">
            {formatarMoeda(r.valor_total)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={r.status} dataVencimento={r.data_vencimento} />
          {r.forma_pagamento && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {r.forma_pagamento}
            </span>
          )}
          {alerta && (
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                alerta.tipo === 'vencido'
                  ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                  : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
              }`}
            >
              ⏰ {alerta.label}
            </span>
          )}
          {Array.isArray(r.anexos) && r.anexos.length > 0 && (
            <span className="rounded-md bg-marca-50 px-2 py-0.5 text-[11px] font-semibold text-marca-700">
              📎 {r.anexos.length}
            </span>
          )}
        </div>
      </div>

      {/* Ficha de informações */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3">
        <Campo rotulo="Lançamento" valor={formatarData(r.data)} />
        <Campo rotulo="Pagar em" valor={r.data_vencimento ? formatarData(r.data_vencimento) : null} faltando={faltaData} destaque />
        <Campo rotulo="Fornecedor" valor={r.fornecedor} />
        <Campo rotulo="Pago por (PF/CNPJ)" valor={r.empresa} faltando={faltaPfCnpj} />
        <Campo rotulo="Documento (NF)" valor={r.cnpj_cpf} />
        <Campo rotulo="Quem paga" valor={r.pagador} />
        {r.codigo_glpi && <Campo rotulo="GLPI" valor={r.codigo_glpi} />}
      </dl>

      {/* Rodapé: pendência + ação */}
      {(aba === 'pendente' || aba === 'enviado') && (
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5">
          {aba === 'pendente' &&
            (pronto ? (
              <>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ Pronto p/ enviar
                </span>
                {podeEditar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatus('Enviado')
                    }}
                    className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 active:scale-95"
                  >
                    Enviar p/ pagamento →
                  </button>
                )}
              </>
            ) : (
              <span className="rounded-md bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                ⏳ Falta: {falta.join(' · ')}
              </span>
            ))}

          {aba === 'enviado' && podeEditar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatus('Pago')
              }}
              className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
            >
              💰 Marcar como pago
            </button>
          )}
        </div>
      )}
    </div>
  )
}
