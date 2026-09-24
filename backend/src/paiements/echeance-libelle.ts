/**
 * Libellé affiché d'une échéance : une mensualité devient « Mensualité -
 * Août 2026 » (à partir de sa date), les autres libellés restent tels quels.
 */
export function formatEcheanceLibelle(
  libelle: string,
  dateEcheance?: Date | string | null,
): string {
  if (!libelle) return '';
  if (
    (libelle.toLowerCase().startsWith('mensualit') || libelle.includes('/')) &&
    dateEcheance
  ) {
    try {
      const d = new Date(dateEcheance);
      if (!isNaN(d.getTime())) {
        const monthName = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return `Mensualité - ${formattedMonth}`;
      }
    } catch {
      /* date illisible : libellé brut */
    }
  }
  return libelle;
}
