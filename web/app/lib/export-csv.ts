/**
 * Utilitaire d'exportation de données sous format CSV avec encodage UTF-8 BOM pour Excel.
 */
export function exporterEnCsv(
  nomFichier: string,
  enTetes: string[],
  lignes: (string | number | boolean | null | undefined)[][]
) {
  if (typeof window === "undefined") return;

  const echapper = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const contenuEnTetes = enTetes.map(echapper).join(";");
  const contenuLignes = lignes
    .map((l) => l.map(echapper).join(";"))
    .join("\r\n");

  // UTF-8 BOM pour garantir la bonne ouverture des caractères accentués sous Microsoft Excel
  const bom = "\uFEFF";
  const csvComplet = `${bom}${contenuEnTetes}\r\n${contenuLignes}`;

  const blob = new Blob([csvComplet], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${nomFichier}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
