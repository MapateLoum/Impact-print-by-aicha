const WHATSAPP_PHONE = "221772203048";

export const WHATSAPP_CONTACT_MESSAGE =
  "Bonjour Aicha, je souhaite obtenir des renseignements sur vos produits et services.";
export const WHATSAPP_ORDER_MESSAGE =
  "Bonjour Aicha, je souhaite passer une commande. Pouvez-vous m’accompagner ?";

export function getWhatsAppUrl(message?: string) {
  const text = message ? `&text=${encodeURIComponent(message)}` : "";
  return `whatsapp://send?phone=${WHATSAPP_PHONE}${text}`;
}

export function getWhatsAppWebUrl(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${WHATSAPP_PHONE}${text}`;
}
