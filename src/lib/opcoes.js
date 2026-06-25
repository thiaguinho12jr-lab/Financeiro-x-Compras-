import { LISTAS_CADASTRO } from './listasCadastro.js'

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
  pagador: [
    'Carine Silveira',
    'Carliane Santos',
    'Daiane Moinhos',
    'Edilane Cunha',
    'Geisa Freitas',
    'Jéssica Freitas',
    'Michelle Tosta',
    'Paula Rohrs',
    'Rachel Amorim',
    'Roberta Alves',
    'Sinara Santos',
    'Sophia Goodwin',
  ],

  // Quem solicitou a compra (preenchido conforme o uso)
  solicitante: [],

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
  ],

  // Centros / setores de custo
  centro_custo: [],
  setor_custo: [],

  // Locais de entrega
  local_entrega: [],
}

// Remove códigos/números no INÍCIO do texto (ex.: "272 - ", "2x -134 - ",
// "73 - 6x - "), preservando palavras que começam com letra (ex.: "Xerox").
function limparPrefixoNumerico(v) {
  const limpo = v.replace(/^([\d.]+\s*[xX]?\s*|[\s\-–—×]+)+/, '').trim()
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

// Valores que nunca devem aparecer como sugestão (por chave canônica).
const EXCLUIR = new Set(['brunon'])

// Únicos campos que mostram sugestões automáticas. Todos os outros
// (Fornecedor, Centro de custo, Local de entrega, Cidade/UF, CNPJ/CPF...)
// são digitados manualmente, sem lista suspensa.
const CAMPOS_COM_SUGESTAO = new Set([
  'empresa', // Pago por (PF/CNPJ) — Solicitações
  'conta_pagamento', // Pago por (PF/CNPJ) — Fundo de Caixa
  'pagador', // Quem vai pagar (responsável)
  'forma_pagamento', // Forma de pagamento
])

// Chave para comparar valores ignorando acento, maiúsculas, espaços e pontuação.
// "DELL" e "Dell", "PF IGOR" e "PF - Igor", "Flex form" e "Flexform" => mesma chave.
function chaveCanonica(v) {
  return String(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Monta a lista de sugestões de um campo: junta a lista curada (LISTAS),
 * a lista vinda da planilha (LISTAS_CADASTRO) e os valores já existentes nos
 * registros; aplica limpeza/normalização, remove duplicidades de forma
 * inteligente (acento/maiúscula/espaço) e ordena.
 */
export function montarSugestoes(nomeCampo, registros) {
  // Campos sem sugestão: digitação 100% manual (retorna lista vazia).
  if (!CAMPOS_COM_SUGESTAO.has(nomeCampo)) return []

  const norm = NORMALIZADORES[nomeCampo]
  const mapa = new Map() // chaveCanonica -> texto exibido (1ª ocorrência vence)

  const adicionar = (bruto) => {
    if (bruto === null || bruto === undefined) return
    let s = String(bruto).trim()
    if (!s || s === '-') return
    if (/\bGMT\b/i.test(s) || /horário/i.test(s)) return // lixo de data/hora
    if (norm) s = norm(s)
    if (!s) return
    const k = chaveCanonica(s)
    if (!k || EXCLUIR.has(k) || mapa.has(k)) return
    mapa.set(k, s)
  }

  // Ordem de preferência: curada > planilha > dados já lançados
  for (const v of LISTAS[nomeCampo] ?? []) adicionar(v)
  for (const v of LISTAS_CADASTRO[nomeCampo] ?? []) adicionar(v)
  for (const r of registros ?? []) adicionar(r[nomeCampo])

  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
