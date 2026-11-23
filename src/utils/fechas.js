export const ZONA_TALLER = 'America/Tijuana';

const formatoTaller = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_TALLER,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function fechaDelTaller(valor = new Date()) {
  if (!valor) return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return '';
  const partes = Object.fromEntries(
    formatoTaller.formatToParts(fecha).map(({ type, value }) => [type, value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}
