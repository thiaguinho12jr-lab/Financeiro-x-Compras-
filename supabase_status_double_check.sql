-- ============================================================
-- Corrige o STATUS conforme a planilha (Excel) atual de pendentes.
--
-- Regra da planilha:
--   • "DOUBLE check" (vermelho)  => JÁ FORAM ENVIADOS p/ pagamento  => status 'Enviado'
--   • "PENDENTE" (amarelo)       => continuam 'Pendente'
--
-- Os 5 itens que continuam PENDENTE (amarelo) na sua foto:
--   Rolos Bolhas · PRIMER PR-200 · Mini Computador Login
--   · Bobina brother · Sacola pequena Vx case
--
-- Este script só mexe em solicitações que HOJE estão como 'Pendente'.
-- (Itens já 'Pago'/'Enviado' não são tocados.)
-- Cole no SQL Editor do Supabase e clique em Run.
-- ============================================================

-- 1) PREVIEW (opcional) — rode SÓ esta consulta primeiro para conferir
--    a lista do que vai virar 'Enviado'. Se bater com o Excel, siga p/ o passo 2.
-- select data, produto, valor_total, status
-- from public.solicitacoes
-- where status = 'Pendente'
--   and produto not ilike '%Rolos Bolhas%'
--   and produto not ilike '%PRIMER%PR-200%'
--   and produto not ilike '%Mini Computador%'
--   and produto not ilike '%Bobina%'
--   and produto not ilike '%Sacola pequena%'
-- order by data;

-- 2) ATUALIZAÇÃO
update public.solicitacoes
set status = 'Enviado',
    updated_at = now()
where status = 'Pendente'
  and produto not ilike '%Rolos Bolhas%'
  and produto not ilike '%PRIMER%PR-200%'
  and produto not ilike '%Mini Computador%'
  and produto not ilike '%Bobina%'
  and produto not ilike '%Sacola pequena%';
