-- ============================================================
-- Novo campo "pagador" = a responsável que VAI EXECUTAR o pagamento
-- (ex.: Carine). Diferente de "Pago por (PF/CNPJ)" (onde sai a NF).
-- Cole no SQL Editor do Supabase e clique em Run (uma vez).
-- ============================================================

alter table public.solicitacoes add column if not exists pagador text;
