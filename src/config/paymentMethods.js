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
    instructions: 'Transfer to CBE account:\nAccount Number: 1000258394317\nAccount Name: Gaddisa Tegene\n\nAfter transfer, upload the receipt screenshot.',
    instructionsAm: 'ወደ CBE መለያ ያስተላልፉ:\nመለያ ቁጥር: 1000258394317\nየመለያ ስም: Gaddisa Tegene\n\nከማስተላለፍ በኋላ ደረሰኝ ስክሪንሾት ይላኩ።',
    active: true,
    icon: '🏦'
  },
  {
    id: 'awash',
    name: 'Awash Bank',
    nameAm: 'አዋሽ ባንክ',
    account: '013201050916601',
    accountName: 'Gaddisa Tegene',
    instructions: 'Transfer to Awash Bank account:\nAccount Number: 013201050916601\nAccount Name: Gaddisa Tegene\n\nAfter transfer, upload the receipt screenshot.',
    instructionsAm: 'ወደ አዋሽ ባንክ መለያ ያስተላልፉ:\nመለያ ቁጥር: 013201050916601\nየመለያ ስም: Gaddisa Tegene\n\nከማስተላለፍ በኋላ ደረሰኝ ስክሪንሾት ይላኩ።',
    active: true,
    icon: '🏛️'
  },
  {
    id: 'telebirrgadisa',
    name: 'Telebirr(Gadisa)',
    nameAm: 'ቴሌብር (ጋዲሳ)',
    account: '0951895474',
    accountName: 'Gaddisa Tegene',
    instructions: 'Send payment to Telebirr:\nPhone Number: 0951895474\nAccount Name: Gaddisa Tegene\n\nAfter sending, upload the payment screenshot.',
    instructionsAm: 'ወደ ቴሌብር ክፍያ ይላኩ:\nስልክ ቁጥር: 0951895474\nየመለያ ስም: Gaddisa Tegene\n\nከመላክ በኋላ የክፍያ ስክሪንሾት ይላኩ።',
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

