// Shared formatting helpers (DZD currency + Arabic dates).
export function formatDZD(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString('fr-DZ')} دج`;
}

export function formatDateAr(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')));
  } catch {
    return iso;
  }
}
