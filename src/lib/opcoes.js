// Listas fixas (curadas pelo admin) usadas como sugestões nos formulários.
// Você pode me passar os nomes/CNPJs/fornecedores que eu preencho aqui.
//
// Estas listas se SOMAM automaticamente aos valores que já existem nos
// lançamentos — ou seja, todo responsável/CNPJ/fornecedor já usado aparece
// como sugestão sem precisar cadastrar. E ao digitar um novo valor, ele
// passa a aparecer também.

// Pessoas/contas que realizam os pagamentos (responsáveis).
const RESPONSAVEIS = [
  'PF - Alisson',
  'PF - Igor',
  'PF - Jose Celso',
  'PF - Leon',
  'PF - Marcos Raniere',
  'PF - Bruno Neves',
  'PF - Paulo Marcio',
  'PF - Vitor',
  'PF - Tayna',
  'PF - Thales',
  'RC9',
]

export const LISTAS = {
  // Responsável pelo pagamento (pessoas / contas)
  empresa: RESPONSAVEIS,
  conta_pagamento: RESPONSAVEIS,

  // Documentos para emissão de NF
  cnpj_cpf: [],

  // Responsáveis que executam o pagamento (as "meninas" do financeiro)
  pagador: [],

  // Fornecedores recorrentes (Mercado Livre já unificado)
  fornecedor: [
    'Mercado Livre',
    'Mercado Pago',
    'Amazon',
    'Magazine Luiza',
    'Kabum',
    'Dell',
    'Login',
    'Ubiquiti',
    'Flex Form',
    'Ayca Digital',
    'NS Impressoras Digitais',
    'TLT Soluções Corporativas',
    'Visual Bordados',
    'Ivon Camisas',
    'Vale Uniformes',
    'Polo Salvador',
    'Filha e Netas TMJ',
    'PH Química',
    'EMCAIXA',
    'Inovação Indústria',
    'Impressão Bigraf',
    'Potisigns',
    'Camicado',
    'Clone Tech',
  ],

  // Formas de pagamento mais usadas
  forma_pagamento: [
    'BOLETO A VISTA',
    'BOLETO PARCELADO',
    'TRANSFERÊNCIA/ PIX',
    'CARTÃO',
    'Pix',
  ],

  // Centros / setores de custo
  centro_custo: [],
  setor_custo: [],

  // Locais de entrega
  local_entrega: [],
}

// Remove códigos/números no INÍCIO do texto (ex.: "272 - ", "2x -134 - ",
// "73 - 6x - "), preservando números no meio/fim do nome.
function limparPrefixoNumerico(v) {
  const limpo = v.replace(/^[\s\d.xX×\-–—]+/, '').trim()
  return limpo || v.trim()
}

// Padroniza "Cidade - UF" para remover duplicidades por espaçamento/maiúsculas
// (ex.: "Osasco -SP", "Osasco- SP", "Salvador - Ba", "Lauro de Freitas / BA").
function normalizarCidadeEstado(v) {
  const s = v.trim().replace(/\s+/g, ' ')
  const m = s.match(/^(.*?)\s*[-/]\s*([A-Za-zÀ-ú]{2})\s*$/)
  if (m) return `${m[1].trim()} - ${m[2].toUpperCase()}`
  return s
}

const NORMALIZADORES = {
  centro_custo: limparPrefixoNumerico,
  setor_custo: limparPrefixoNumerico,
  cidade_estado: normalizarCidadeEstado,
}

/**
 * Monta a lista de sugestões de um campo: junta a lista curada (LISTAS)
 * com os valores já existentes nos registros, aplica limpeza/normalização
 * quando houver, remove repetidos e ordena.
 */
export function montarSugestoes(nomeCampo, registros) {
  const set = new Set()
  const norm = NORMALIZADORES[nomeCampo]
  const adicionar = (bruto) => {
    if (bruto === null || bruto === undefined) return
    let s = String(bruto).trim()
    if (!s || s === '-') return
    if (norm) s = norm(s)
    if (s) set.add(s)
  }

  for (const v of LISTAS[nomeCampo] ?? []) adicionar(v)
  for (const r of registros ?? []) adicionar(r[nomeCampo])

  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
