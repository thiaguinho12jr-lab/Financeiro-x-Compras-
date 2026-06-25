// Configuração das colunas (tabela) e campos (formulário) de cada tela.
// Centralizado aqui para ser reaproveitado pelas páginas e pela Visão geral.

// Colunas condensadas: cada uma mostra um valor principal + um subtexto,
// para caber tudo na tela sem rolar.
export const COLUNAS_SOLICITACOES = [
  { chave: 'data', rotulo: 'Data', tipo: 'data', sub: 'data_vencimento', subTipo: 'data', subRotulo: '📅 Pagar em', subClasse: 'text-blue-600 font-semibold' },
  {
    chave: 'produto',
    rotulo: 'Produto',
    sub: 'fornecedor',
    principalClasse: 'font-semibold text-slate-800',
    className: 'min-w-[12rem] max-w-[20rem]',
  },
  { chave: 'valor_total', rotulo: 'Valor', tipo: 'moeda', sub: 'forma_pagamento' },
  {
    chave: 'empresa',
    rotulo: 'Responsável',
    sub: 'cnpj_cpf',
    sub2: 'pagador',
    sub2Rotulo: '💳 Paga:',
    sub2Classe: 'text-slate-500 font-medium',
    className: 'max-w-[12rem]',
  },
]

export const CAMPOS_SOLICITACOES = [
  { nome: 'data', rotulo: 'Data', tipo: 'date', obrigatorio: true },
  { nome: 'produto', rotulo: 'Produto', obrigatorio: true, largura: 'full' },
  { nome: 'codigo_glpi', rotulo: 'Código GLPI (chamado)' },
  { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'number' },
  { nome: 'valor_total', rotulo: 'Valor total (R$)', tipo: 'number', obrigatorio: true },
  { nome: 'valor_unitario', rotulo: 'Valor unitário (R$)', tipo: 'number' },
  { nome: 'frete', rotulo: 'Frete (R$)', tipo: 'number' },
  { nome: 'motivo', rotulo: 'Motivo', tipo: 'textarea', largura: 'full' },
  { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 'full' },
  { nome: 'centro_custo', rotulo: 'Centro de custo', tipo: 'datalist' },
  { nome: 'local_entrega', rotulo: 'Local de entrega', tipo: 'datalist' },
  { nome: 'fornecedor', rotulo: 'Fornecedor', tipo: 'datalist' },
  { nome: 'cidade_estado', rotulo: 'Cidade/Estado', tipo: 'datalist' },
  { nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'datalist' },
  { nome: 'empresa', rotulo: 'Pago por (PF/CNPJ)', tipo: 'datalist' },
  { nome: 'cnpj_cpf', rotulo: 'CNPJ/CPF (NF)', tipo: 'datalist' },
  { nome: 'pagador', rotulo: 'Quem vai pagar (responsável)', tipo: 'datalist' },
  { nome: 'data_vencimento', rotulo: 'Data de pagamento', tipo: 'date' },
  { nome: 'prioridade', rotulo: 'Prioridade', tipo: 'checkbox', largura: 'full' },
  { nome: 'status', rotulo: 'Status', tipo: 'select' },
]

export const COLUNAS_FUNDO = [
  { chave: 'data', rotulo: 'Data', tipo: 'data' },
  {
    chave: 'produto',
    rotulo: 'Produto',
    sub: 'detalhamento',
    principalClasse: 'font-semibold text-slate-800',
    className: 'min-w-[12rem] max-w-[22rem]',
  },
  { chave: 'valor_total', rotulo: 'Valor', tipo: 'moeda', sub: 'forma_pagamento' },
  { chave: 'conta_pagamento', rotulo: 'Responsável', sub: 'fornecedor', className: 'max-w-[12rem]' },
]

export const CAMPOS_FUNDO = [
  { nome: 'data', rotulo: 'Data', tipo: 'date', obrigatorio: true },
  { nome: 'produto', rotulo: 'Produto', obrigatorio: true, largura: 'full' },
  { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'number' },
  { nome: 'valor_total', rotulo: 'Valor total (R$)', tipo: 'number', obrigatorio: true },
  { nome: 'valor_unitario', rotulo: 'Valor unitário (R$)', tipo: 'number' },
  { nome: 'frete', rotulo: 'Frete (R$)', tipo: 'number' },
  { nome: 'detalhamento', rotulo: 'Detalhamento', tipo: 'textarea', largura: 'full' },
  { nome: 'setor_custo', rotulo: 'Setor de custo', tipo: 'datalist' },
  { nome: 'local_entrega', rotulo: 'Local de entrega', tipo: 'datalist' },
  { nome: 'fornecedor', rotulo: 'Fornecedor', tipo: 'datalist' },
  { nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'datalist' },
  { nome: 'conta_pagamento', rotulo: 'Pago por (PF/CNPJ)', tipo: 'datalist' },
  { nome: 'nf', rotulo: 'NF' },
]
