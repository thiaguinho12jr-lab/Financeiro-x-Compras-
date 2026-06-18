import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const PAPEIS = ['admin', 'editor', 'visualizador']

const ROTULOS_PAPEL = {
  admin: 'Administrador',
  editor: 'Editor',
  visualizador: 'Visualizador',
}

export default function Usuarios() {
  const { usuario } = useAuth()
  const [perfis, setPerfis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvandoId, setSalvandoId] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nome, role, created_at')
      .order('created_at', { ascending: true })
    if (error) setErro(error.message)
    else {
      setErro('')
      setPerfis(data ?? [])
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function mudarPapel(id, novoPapel) {
    setSalvandoId(id)
    const { error } = await supabase.from('profiles').update({ role: novoPapel }).eq('id', id)
    setSalvandoId(null)
    if (error) {
      setErro('Não foi possível atualizar o papel: ' + error.message)
    } else {
      setPerfis((lista) => lista.map((p) => (p.id === id ? { ...p, role: novoPapel } : p)))
    }
  }

  function mudarNomeLocal(id, nome) {
    setPerfis((lista) => lista.map((p) => (p.id === id ? { ...p, nome } : p)))
  }

  async function salvarNome(id, nome) {
    const { error } = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', id)
    if (error) setErro('Não foi possível salvar o nome: ' + error.message)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Gerenciar usuários</h2>
        <p className="text-sm text-slate-500">
          Defina o <strong>nome</strong> e o <strong>papel</strong> de cada pessoa. As alterações
          valem imediatamente. O nome aparece nos avisos do WhatsApp.
        </p>
      </div>

      <div className="rounded-xl border border-marca-100 bg-marca-50 p-4 text-sm text-marca-900">
        <p className="font-semibold">Como convidar uma nova pessoa</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-marca-800">
          <li>
            No painel do Supabase, vá em <strong>Authentication → Users → Add user</strong> e
            crie o login com e-mail e senha.
          </li>
          <li>
            A pessoa aparecerá aqui automaticamente como <strong>Visualizador</strong>.
          </li>
          <li>Altere o papel dela na tabela abaixo, se necessário.</li>
        </ol>
      </div>

      {erro && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {erro}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto scroll-suave">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nome
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  E-mail
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Papel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    Carregando usuários...
                  </td>
                </tr>
              ) : perfis.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                perfis.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={p.nome ?? ''}
                          onChange={(e) => mudarNomeLocal(p.id, e.target.value)}
                          onBlur={(e) => salvarNome(p.id, e.target.value)}
                          placeholder="Nome da pessoa"
                          className="w-44 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-marca-600 focus:ring-2 focus:ring-marca-100"
                        />
                        {p.id === usuario?.id && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                            você
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{p.email}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={p.role}
                        disabled={salvandoId === p.id}
                        onChange={(e) => mudarPapel(p.id, e.target.value)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-marca-600 disabled:opacity-60"
                      >
                        {PAPEIS.map((papel) => (
                          <option key={papel} value={papel}>
                            {ROTULOS_PAPEL[papel]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
