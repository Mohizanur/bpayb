/**
 * Hardcoded Payment Methods Configuration
 * This avoids DB reads and saves quota
 * Update this file when payment methods change
 */

export const PAYMENT_METHODS = [
  {
    id: 'cbe',
    name: 'Commercial Bank of Ethiopia',
    nameAm: 'የኢትዮጵያ ንግድ ባንክ',
    account: '1000258394317',
    accountName: 'Gaddisa Tegene',
    instructions: 'After making payment to any account above, upload the receipt screenshot.',
    instructionsAm: 'ከላይ ያሉትን መለያዎች ወደ አንዱ ክፍያ ካደረጉ በኋላ ደረሰኝ ስክሪንሾት ይላኩ።',
    active: true,
    icon: '🏦'
  },
  {
    id: 'awash',
    name: 'Awash Bank',
    nameAm: 'አዋሽ ባንክ',
    account: '013201050916601',
    accountName: 'Gaddisa Tegene',
    instructions: 'After making payment to any account above, upload the receipt screenshot.',
    instructionsAm: 'ከላይ ያሉትን መለያዎች ወደ አንዱ ክፍያ ካደረጉ በኋላ ደረሰኝ ስክሪንሾት ይላኩ።',
    active: true,
    icon: '🏛️'
  },
  {
    id: 'telebirrgadisa',
    name: 'Telebirr(Gadisa)',
    nameAm: 'ቴሌብር (ጋዲሳ)',
    account: '0951895474',
    accountName: 'Gaddisa Tegene',
    instructions: 'After making payment to any account above, upload the receipt screenshot.',
    instructionsAm: 'ከላይ ያሉትን መለያዎች ወደ አንዱ ክፍያ ካደረጉ በኋላ ደረሰኝ ስክሪንሾት ይላኩ።',
    active: true,
    icon: '📱'
  }
];

/**
 * Get active payment methods (hardcoded, no DB read)
 */
export function getPaymentMethods() {
  return PAYMENT_METHODS.filter(method => method.active);
}

