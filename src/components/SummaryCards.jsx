import { formatarMoeda } from '../lib/format.js'

function Cartao({ titulo, valor, detalhe, cor, ponto }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        {ponto && <span className={`inline-block h-2 w-2 rounded-full ${ponto}`} />}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      </div>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>}
    </div>
  )
}

/**
 * Cartões de resumo (somente informação). O filtro por status é feito
 * pelas pílulas (StatusTabs).
 */
export default function SummaryCards({
  totalGasto,
  qtdPendentes,
  qtdEnviados,
  qtdPagos,
  qtdReembolsados,
  qtdTotal,
  modoSimples = false,
}) {
  if (modoSimples) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Cartao
          titulo="Total no período"
          valor={formatarMoeda(totalGasto)}
          detalhe={`${qtdTotal} lançamento${qtdTotal === 1 ? '' : 's'}`}
          cor="text-slate-800"
        />
        <Cartao titulo="Pagos" valor={qtdPagos} detalhe="quitados" cor="text-emerald-600" ponto="bg-emerald-500" />
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
      />
      <Cartao
        titulo="Pendentes"
        valor={qtdPendentes}
        detalhe="aguardando envio"
        cor="text-amber-600"
        ponto="bg-amber-500"
      />
      <Cartao
        titulo="Enviados"
        valor={qtdEnviados}
        detalhe="pagamento enviado"
        cor="text-blue-600"
        ponto="bg-blue-500"
      />
      <Cartao
        titulo="Pagos"
        valor={qtdPagos}
        detalhe="quitados"
        cor="text-emerald-600"
        ponto="bg-emerald-500"
      />
      <Cartao
        titulo="Reembolsados"
        valor={qtdReembolsados}
        detalhe="não contam no gasto"
        cor="text-violet-600"
        ponto="bg-violet-500"
      />
    </div>
  )
}
