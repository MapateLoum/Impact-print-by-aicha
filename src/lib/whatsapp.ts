const WHATSAPP_PHONE = "221772203048";

export function getWhatsAppUrl(message?: string) {
  const text = message ? `&text=${encodeURIComponent(message)}` : "";
  return `whatsapp://send?phone=${WHATSAPP_PHONE}${text}`;
}

export function getWhatsAppWebUrl(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${WHATSAPP_PHONE}${text}`;
}
