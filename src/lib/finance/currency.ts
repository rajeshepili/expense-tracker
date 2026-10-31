export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'TRY',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'ZAR',
  'NGN',
  'EGP',
  'KES',
  'AED',
  'SAR',
  'ILS',
  'SGD',
  'HKD',
  'TWD',
  'KRW',
  'CNY',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'NZD',
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value)
}

export function currencyLabel(code: string) {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).formatToParts(0)
    const symbol = parts.find((part) => part.type === 'currency')?.value ?? code
    return symbol === code ? code : `${code} (${symbol})`
  } catch {
    return code
  }
}

export const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)

export const percent = (value: number) =>
  new Intl.NumberFormat('en', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
