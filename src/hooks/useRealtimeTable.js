import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Carrega os registros de uma tabela e mantém a lista atualizada em tempo real
 * (inserções, edições e exclusões) via Supabase Realtime.
 *
 * @param {string} tabela  nome da tabela ('solicitacoes' ou 'fundo_caixa')
 * @returns { registros, carregando, erro, recarregar }
 */
export function useRealtimeTable(tabela) {
  const [registros, setRegistros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .order('data', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      setErro(error.message)
    } else {
      setErro(null)
      setRegistros(data ?? [])
    }
    setCarregando(false)
  }, [tabela])

  useEffect(() => {
    recarregar()

    const canal = supabase
      .channel(`realtime:${tabela}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabela },
        (payload) => {
          setRegistros((atuais) => {
            if (payload.eventType === 'INSERT') {
              // Evita duplicar caso o registro já esteja na lista
              if (atuais.some((r) => r.id === payload.new.id)) return atuais
              return ordenar([payload.new, ...atuais])
            }
            if (payload.eventType === 'UPDATE') {
              return ordenar(
                atuais.map((r) => (r.id === payload.new.id ? payload.new : r)),
              )
            }
            if (payload.eventType === 'DELETE') {
              return atuais.filter((r) => r.id !== payload.old.id)
            }
            return atuais
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [tabela, recarregar])

  // Atualização otimista: muda um registro na tela na hora (sem esperar o servidor)
  const patchLocal = useCallback((id, mudancas) => {
    setRegistros((atuais) => ordenar(atuais.map((r) => (r.id === id ? { ...r, ...mudancas } : r))))
  }, [])

  return { registros, carregando, erro, recarregar, patchLocal }
}

function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const da = a.data ?? ''
    const db = b.data ?? ''
    if (da !== db) return db.localeCompare(da)
    return (b.id ?? 0) - (a.id ?? 0)
  })
}
