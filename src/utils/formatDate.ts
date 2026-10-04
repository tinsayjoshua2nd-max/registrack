export function formatDateInManila(value: string | null | undefined): string {
  if (!value?.trim()) return value ?? '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const includesTime = value.includes('T') || /\d{1,2}:\d{2}/.test(value);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includesTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}