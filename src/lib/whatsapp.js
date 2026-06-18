// Telefone da gerente do setor que recebe os avisos.
// Formato: DDI + DDD + número, só dígitos. Ex.: Brasil (55) + (71) + 98888-7777
//   => '5571988887777'
// Deixe vazio ('') para abrir o WhatsApp e escolher o contato na hora.
export const TELEFONE_GERENTE = ''

/** Monta o link "click to chat" do WhatsApp com a mensagem pré-preenchida. */
export function linkWhatsApp(mensagem) {
  const texto = encodeURIComponent(mensagem)
  return TELEFONE_GERENTE
    ? `https://wa.me/${TELEFONE_GERENTE}?text=${texto}`
    : `https://api.whatsapp.com/send?text=${texto}`
}
