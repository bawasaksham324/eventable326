import QRCode from 'qrcode';

const PUBLIC_TICKET_ORIGIN = 'https://eventable-wine.vercel.app';

export async function createTicketQrCode(publicToken) {
  const ticketUrl = new URL(`/ticket/${encodeURIComponent(publicToken)}`, PUBLIC_TICKET_ORIGIN).toString();
  return QRCode.toDataURL(ticketUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
    color: {
      dark: '#12090c',
      light: '#f5e9e9',
    },
  });
}
