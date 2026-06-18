import { formatarMoeda } from '../lib/format.js'

/**
 * Cartão clicável que funciona como "menu" de status.
 * Tocar nele filtra a lista por aquele status (tocar de novo no ativo limpa).
 */
function Cartao({ titulo, valor, detalhe, cor, ativo, onClick, anelAtivo, clicavel }) {
  const Tag = clicavel ? 'button' : 'div'
  return (
    <Tag
      type={clicavel ? 'button' : undefined}
      onClick={clicavel ? onClick : undefined}
      aria-pressed={clicavel ? ativo : undefined}
      className={[
        'rounded-xl border bg-white p-4 text-left shadow-sm transition',
        clicavel ? 'active:scale-[0.98]' : '',
        ativo
          ? `${anelAtivo} ring-2`
          : 'border-slate-200 ' + (clicavel ? 'hover:border-slate-300 hover:shadow' : ''),
      ].join(' ')}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>}
    </Tag>
  )
}

/**
 * @param {{
 *   totalGasto:number, qtdPendentes:number, qtdEnviados:number, qtdPagos:number,
 *   qtdReembolsados:number, qtdTotal:number,
 *   statusAtivo:string,            // '' | 'pendente' | 'enviado' | 'pago' | 'reembolsado'
 *   aoSelecionarStatus:Function,
 *   modoSimples?:boolean,
 * }} props
 */
export default function SummaryCards({
  totalGasto,
  qtdPendentes,
  qtdEnviados,
  qtdPagos,
  qtdReembolsados,
  qtdTotal,
  statusAtivo,
  aoSelecionarStatus,
  modoSimples = false,
}) {
  function alternar(chave) {
    aoSelecionarStatus(statusAtivo === chave ? '' : chave)
  }

  if (modoSimples) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Cartao
          titulo="Total no período"
          valor={formatarMoeda(totalGasto)}
          detalhe={`${qtdTotal} lançamento${qtdTotal === 1 ? '' : 's'}`}
          cor="text-slate-800"
          clicavel={false}
        />
        <Cartao
          titulo="Pagos"
          valor={qtdPagos}
          detalhe="quitados"
          cor="text-emerald-600"
          clicavel={false}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Cartao
        titulo="Total gasto"
        valor={formatarMoeda(totalGasto)}
        detalhe={`${qtdTotal} itens · exceto reembolsados`}
        cor="text-slate-800"
        clicavel
        ativo={statusAtivo === ''}
        anelAtivo="border-marca-300 ring-marca-200"
        onClick={() => aoSelecionarStatus('')}
      />
      <Cartao
        titulo="Pendentes"
        valor={qtdPendentes}
        detalhe="aguardando envio"
        cor="text-amber-600"
        clicavel
        ativo={statusAtivo === 'pendente'}
        anelAtivo="border-amber-300 ring-amber-200"
        onClick={() => alternar('pendente')}
      />
      <Cartao
        titulo="Enviados"
        valor={qtdEnviados}
        detalhe="pagamento enviado"
        cor="text-blue-600"
        clicavel
        ativo={statusAtivo === 'enviado'}
        anelAtivo="border-blue-300 ring-blue-200"
        onClick={() => alternar('enviado')}
      />
      <Cartao
        titulo="Pagos"
        valor={qtdPagos}
        detalhe="quitados"
        cor="text-emerald-600"
        clicavel
        ativo={statusAtivo === 'pago'}
        anelAtivo="border-emerald-300 ring-emerald-200"
        onClick={() => alternar('pago')}
      />
      <Cartao
        titulo="Reembolsados"
        valor={qtdReembolsados}
        detalhe="não contam no gasto"
        cor="text-violet-600"
        clicavel
        ativo={statusAtivo === 'reembolsado'}
        anelAtivo="border-violet-300 ring-violet-200"
        onClick={() => alternar('reembolsado')}
      />
    </div>
  )
}
