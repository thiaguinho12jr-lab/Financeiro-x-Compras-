import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null) // { id, email, nome, role }
  const [carregando, setCarregando] = useState(true)

  // Busca o perfil (papel/nome) do usuário logado na tabela public.profiles.
  // Tem um limite de tempo (8s): se o Supabase não responder (ex.: projeto
  // pausado/instável), não trava a tela — segue sem perfil.
  const carregarPerfil = useCallback(async (userId) => {
    if (!userId) {
      setPerfil(null)
      return
    }
    try {
      const consulta = supabase
        .from('profiles')
        .select('id, email, nome, role')
        .eq('id', userId)
        .single()
      const limite = new Promise((_, rej) =>
        setTimeout(() => rej(new Error('Tempo esgotado ao buscar perfil')), 8000)
      )
      const { data, error } = await Promise.race([consulta, limite])
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Erro ao carregar perfil:', error.message)
        setPerfil(null)
      } else {
        setPerfil(data)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Perfil não carregou a tempo:', e.message)
      setPerfil(null)
    }
  }, [])

  useEffect(() => {
    let ativo = true

    // Failsafe: libera a tela em no máximo 10s mesmo se algo travar.
    const destravar = setTimeout(() => ativo && setCarregando(false), 10000)

    // Sessão inicial
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!ativo) return
        setSession(session)
        await carregarPerfil(session?.user?.id)
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Erro ao obter sessão:', e?.message)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    // Escuta mudanças de login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evento, novaSessao) => {
      setSession(novaSessao)
      await carregarPerfil(novaSessao?.user?.id)
      setCarregando(false)
    })

    return () => {
      ativo = false
      clearTimeout(destravar)
      subscription.unsubscribe()
    }
  }, [carregarPerfil])

  const entrar = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    return error
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }, [])

  const papel = perfil?.role ?? null
  const podeEditar = papel === 'admin' || papel === 'editor'
  const ehAdmin = papel === 'admin'

  const valor = {
    session,
    usuario: session?.user ?? null,
    perfil,
    papel,
    podeEditar,
    ehAdmin,
    carregando,
    entrar,
    sair,
    recarregarPerfil: () => carregarPerfil(session?.user?.id),
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
