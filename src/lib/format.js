// Utilitários de formatação e regras de status (datas, moeda, vencimento).

const moedaBR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata número para R$ 1.234,56 */
export function formatarMoeda(valor) {
  const n = Number(valor)
  if (valor === null || valor === undefined || Number.isNaN(n)) return 'R$ 0,00'
  return moedaBR.format(n)
}

/** Converte 'YYYY-MM-DD' para 'DD/MM/AAAA' sem cair em fuso horário. */
export function formatarData(dataISO) {
  if (!dataISO) return '—'
  const partes = String(dataISO).slice(0, 10).split('-')
  if (partes.length !== 3) return '—'
  const [ano, mes, dia] = partes
  return `${dia}/${mes}/${ano}`
}

/** 'YYYY-MM' a partir de uma data ISO, usado nos filtros por mês. */
export function mesDaData(dataISO) {
  if (!dataISO) return ''
  return String(dataISO).slice(0, 7)
}

/** 'YYYY' a partir de uma data ISO, usado no filtro por ano. */
export function anoDaData(dataISO) {
  if (!dataISO) return ''
  return String(dataISO).slice(0, 4)
}

export const NOMES_MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

/** Número do mês (1-12) -> 'Jan', 'Fev'... */
export function abrevMes(numeroMes) {
  const idx = Number(numeroMes) - 1
  if (idx < 0 || idx > 11) return ''
  return NOMES_MESES_ABREV[idx]
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** 'YYYY-MM' -> 'Janeiro/2026' */
export function rotuloMes(mesISO) {
  if (!mesISO) return ''
  const [ano, mes] = mesISO.split('-')
  const idx = Number(mes) - 1
  if (idx < 0 || idx > 11) return mesISO
  return `${NOMES_MESES[idx]}/${ano}`
}

/** Timestamp ISO -> 'DD/MM/AAAA HH:mm' (horário local). */
export function formatarDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} ${hh}:${mm}`
}

/** Data de hoje em 'YYYY-MM-DD' (horário local). */
export function hojeISO() {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Diferença em dias inteiros entre uma data ISO e hoje (positivo = no futuro). */
export function diasAteVencimento(dataVencimentoISO) {
  if (!dataVencimentoISO) return null
  const hoje = new Date(hojeISO() + 'T00:00:00')
  const venc = new Date(String(dataVencimentoISO).slice(0, 10) + 'T00:00:00')
  const msPorDia = 1000 * 60 * 60 * 24
  return Math.round((venc - hoje) / msPorDia)
}

/**
 * Calcula a situação visual de um registro a partir do status.
 * Fluxo de status: Pendente -> Enviado -> Pago.
 * Retorna: { chave, rotulo, classeBadge, classeLinha }
 *
 * - 'Pago'     -> verde
 * - 'Enviado'  -> azul
 * - 'Pendente' -> âmbar (vermelho discreto na linha se o vencimento já passou)
 */
export function situacaoVencimento(status, dataVencimentoISO) {
  if (status === 'Pago') {
    return {
      chave: 'pago',
      rotulo: 'Pago',
      classeBadge: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
      classeLinha: '',
    }
  }

  if (status === 'Enviado') {
    return {
      chave: 'enviado',
      rotulo: 'Enviado',
      classeBadge: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
      classeLinha: '',
    }
  }

  if (status === 'Reembolsado') {
    return {
      chave: 'reembolsado',
      rotulo: 'Reembolsado',
      classeBadge: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
      classeLinha: 'bg-violet-50/40',
    }
  }

  // Pendente
  const dias = diasAteVencimento(dataVencimentoISO)
  const venceu = dias !== null && dias < 0
  return {
    chave: 'pendente',
    rotulo: venceu ? 'Pendente · vencido' : 'Pendente',
    classeBadge: venceu
      ? 'bg-red-100 text-red-800 ring-1 ring-red-200'
      : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    classeLinha: venceu ? 'bg-red-50' : '',
  }
}

export const OPCOES_STATUS = ['Pendente', 'Enviado', 'Pago', 'Reembolsado']

/**
 * Agrupa um registro em uma das famílias de status usadas nos
 * filtros e cartões: 'pago', 'enviado', 'reembolsado' ou 'pendente'.
 */
export function grupoStatus(status) {
  if (status === 'Pago') return 'pago'
  if (status === 'Enviado') return 'enviado'
  if (status === 'Reembolsado') return 'reembolsado'
  return 'pendente'
}

const temValor = (v) => Boolean(v !== null && v !== undefined && String(v).trim())

/**
 * O que o financeiro ainda precisa preencher num pedido para liberar o pagamento.
 * Retorna um array de rótulos do que falta (vazio = está completo).
 */
export function pendenciasPagamento(r) {
  const falta = []
  // PF OU CNPJ já basta (definir um não exige o outro)
  if (!(temValor(r.empresa) || temValor(r.cnpj_cpf))) falta.push('PF/CNPJ')
  if (!temValor(r.data_vencimento)) falta.push('data de pagamento')
  return falta
}

/** Um pedido está completo (pronto para enviar) quando não falta nada. */
export function pedidoCompleto(r) {
  return pendenciasPagamento(r).length === 0
}
