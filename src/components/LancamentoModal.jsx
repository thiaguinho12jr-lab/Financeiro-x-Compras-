import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { OPCOES_STATUS } from '../lib/format.js'

/**
 * Modal de criação/edição de lançamento, dirigido por uma lista de campos.
 *
 * @param {{
 *   aberto: boolean,
 *   aoFechar: Function,
 *   tabela: string,            // 'solicitacoes' | 'fundo_caixa'
 *   titulo: string,
 *   campos: Array<{nome,rotulo,tipo?,obrigatorio?,largura?}>,
 *   registro?: object|null,    // se presente, modo edição
 *   aoSalvar?: Function
 * }} props
 */
export default function LancamentoModal({
  aberto,
  aoFechar,
  tabela,
  titulo,
  campos,
  registro = null,
  aoSalvar,
  statusPadrao = 'Pendente',
  sugestoes = {},
}) {
  const { usuario } = useAuth()
  const [valores, setValores] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const editando = Boolean(registro?.id)

  useEffect(() => {
    if (!aberto) return
    const inicial = {}
    for (const campo of campos) {
      const v = registro?.[campo.nome]
      inicial[campo.nome] = v === null || v === undefined ? '' : v
    }
    // status de um lançamento novo começa no padrão da tela
    if (!inicial.status) inicial.status = statusPadrao
    setValores(inicial)
    setErro('')
  }, [aberto, registro, campos, statusPadrao])

  if (!aberto) return null

  function definir(nome, valor) {
    setValores((v) => {
      const novo = { ...v, [nome]: valor }
      // Cálculo automático: valor_total = (unitário × quantidade) + frete
      if (['quantidade', 'valor_unitario', 'frete'].includes(nome)) {
        const q = parseFloat(novo.quantidade)
        const u = parseFloat(novo.valor_unitario)
        const f = parseFloat(novo.frete) || 0
        if (!Number.isNaN(q) && !Number.isNaN(u)) {
          novo.valor_total = Number((u * q + f).toFixed(2))
        }
      }
      return novo
    })
  }

  function validar() {
    if (!valores.data) return 'Informe a data.'
    if (!valores.produto?.toString().trim()) return 'Informe o produto.'
    const total = Number(valores.valor_total)
    if (valores.valor_total === '' || Number.isNaN(total)) return 'Informe o valor total.'
    return ''
  }

  async function aoEnviar(e) {
    e.preventDefault()
    const msg = validar()
    if (msg) {
      setErro(msg)
      return
    }
    setSalvando(true)
    setErro('')

    // Monta o payload convertendo campos numéricos e tratando vazios como null
    const numericos = ['quantidade', 'valor_total', 'valor_unitario', 'frete']
    const payload = {}
    for (const campo of campos) {
      let v = valores[campo.nome]
      if (v === '' || v === undefined) {
        v = null
      } else if (numericos.includes(campo.nome)) {
        v = Number(v)
      }
      payload[campo.nome] = v
    }

    let resposta
    if (editando) {
      payload.updated_at = new Date().toISOString()
      resposta = await supabase.from(tabela).update(payload).eq('id', registro.id)
    } else {
      payload.created_by = usuario?.id ?? null
      resposta = await supabase.from(tabela).insert(payload)
    }

    setSalvando(false)

    if (resposta.error) {
      setErro('Não foi possível salvar: ' + resposta.error.message)
      return
    }
    aoSalvar?.()
    aoFechar()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={aoFechar}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">
            {editando ? 'Editar lançamento' : titulo}
          </h2>
          <button
            onClick={aoFechar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={aoEnviar} className="px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campos.map((campo) => {
              const tipo = campo.tipo ?? 'text'
              const largura = campo.largura === 'full' ? 'sm:col-span-2' : ''
              const obrig = campo.obrigatorio

              return (
                <div key={campo.nome} className={largura}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {campo.rotulo}
                    {obrig && <span className="text-red-500"> *</span>}
                  </label>

                  {tipo === 'select' ? (
                    <select
                      value={valores[campo.nome] ?? ''}
                      onChange={(e) => definir(campo.nome, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca-600 focus:ring-2 focus:ring-marca-100"
                    >
                      {(campo.opcoes ?? OPCOES_STATUS).map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  ) : tipo === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={valores[campo.nome] ?? ''}
                      onChange={(e) => definir(campo.nome, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca-600 focus:ring-2 focus:ring-marca-100"
                    />
                  ) : tipo === 'datalist' ? (
                    <>
                      <input
                        type="text"
                        list={`lista-${campo.nome}`}
                        value={valores[campo.nome] ?? ''}
                        onChange={(e) => definir(campo.nome, e.target.value)}
                        placeholder="Escolha na lista ou digite um novo"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca-600 focus:ring-2 focus:ring-marca-100"
                      />
                      <datalist id={`lista-${campo.nome}`}>
                        {(sugestoes[campo.nome] ?? []).map((op) => (
                          <option key={op} value={op} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <input
                      type={tipo}
                      step={tipo === 'number' ? '0.01' : undefined}
                      value={valores[campo.nome] ?? ''}
                      onChange={(e) => definir(campo.nome, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca-600 focus:ring-2 focus:ring-marca-100"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {erro && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              {erro}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-800 disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
