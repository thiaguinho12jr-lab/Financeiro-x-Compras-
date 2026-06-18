import TelaLancamentos from '../components/TelaLancamentos.jsx'
import { COLUNAS_FUNDO, CAMPOS_FUNDO } from '../lib/camposConfig.js'

export default function FundoCaixa() {
  return (
    <TelaLancamentos
      tabela="fundo_caixa"
      titulo="Fundo de Caixa"
      colunas={COLUNAS_FUNDO}
      campos={CAMPOS_FUNDO}
      statusWorkflow={false}
      campoResponsavel="conta_pagamento"
    />
  )
}
