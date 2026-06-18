-- ============================================================
-- Acrescenta o 4º status: "Reembolsado"
-- (Pendente / Enviado / Pago / Reembolsado)
-- Cole no SQL Editor do Supabase e clique em Run (uma vez).
-- ============================================================

alter table public.solicitacoes drop constraint if exists solicitacoes_status_check;
alter table public.fundo_caixa  drop constraint if exists fundo_caixa_status_check;

alter table public.solicitacoes
  add constraint solicitacoes_status_check
  check (status in ('Pendente','Enviado','Pago','Reembolsado'));

alter table public.fundo_caixa
  add constraint fundo_caixa_status_check
  check (status in ('Pendente','Enviado','Pago','Reembolsado'));
