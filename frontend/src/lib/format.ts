/**
 * Consistent Indian Rupee (₹) currency formatter
 */
export function formatRupees(amount: number | undefined | null): string {
  if (typeof amount !== "number" || isNaN(amount)) return "₹0.00";
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

