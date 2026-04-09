export function isPortugueseLanguage(language: string | undefined): boolean {
  return (language ?? "en").toLowerCase().startsWith("pt");
}

export function getNumberLocale(language: string | undefined): string {
  return isPortugueseLanguage(language) ? "pt-BR" : "en-US";
}

export function formatUsd(value: number, language: string | undefined, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(getNumberLocale(language), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactUsd(value: number, language: string | undefined): string {
  return new Intl.NumberFormat(getNumberLocale(language), {
    style: "currency",
    currency: "USD",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | Date, language: string | undefined): string {
  return new Date(value).toLocaleDateString(getNumberLocale(language));
}

export function formatDateTime(value: string | Date, language: string | undefined): string {
  return new Date(value).toLocaleString(getNumberLocale(language));
}
