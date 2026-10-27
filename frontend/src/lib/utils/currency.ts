/**
 * Formats paise (integer) or rupees (number) into standard Indian Rupees notation.
 * e.g. 24580000 paise -> ₹2,45,800
 */
export function formatPaise(paise: number | null | undefined): string {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Math.round(paise / 100);
  return formatRupees(rupees);
}

export function formatRupees(rupees: number | null | undefined): string {
  if (rupees == null || isNaN(rupees)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Formats large amounts in Lakhs (e.g. ₹18.4L, ₹11.7L) for dashboard KPI cards.
 */
export function formatLakhs(rupees: number | null | undefined): string {
  if (rupees == null || isNaN(rupees)) return '₹0';
  const lakhs = rupees / 100000;
  return `₹${lakhs.toFixed(1)}L`;
}
