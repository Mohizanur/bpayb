/**
 * Utility functions for formatting and parsing prices
 */

/**
 * Format a price number with commas for readability
 * @param {number|string} price - The price to format
 * @returns {string} Formatted price with commas (e.g., 1000 -> "1,000")
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return '0';
  const numPrice = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : price;
  if (isNaN(numPrice)) return '0';
  return numPrice.toLocaleString('en-US');
}

/**
 * Parse a price string, accepting both formatted (with commas) and unformatted prices
 * @param {string} priceText - The price text to parse (e.g., "1,000" or "1000" or "ETB 1,000")
 * @returns {number|null} Parsed price number or null if invalid
 */
export function parsePrice(priceText) {
  if (!priceText) return null;
  
  // Remove all non-digit characters except decimal point and commas
  // Then remove commas and parse
  const cleaned = priceText.toString().replace(/[^\d.]/g, '').replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Format price for display with currency prefix
 * @param {number|string} price - The price to format
 * @param {string} currency - Currency prefix (default: "ETB")
 * @returns {string} Formatted price string (e.g., "ETB 1,000")
 */
export function formatPriceWithCurrency(price, currency = 'ETB') {
  return `${currency} ${formatPrice(price)}`;
}

