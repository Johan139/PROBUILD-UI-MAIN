import { Pipe, PipeTransform } from '@angular/core';

let defaultCurrencySymbol = '$';

export function setDefaultCurrencySymbol(symbol: string): void {
  defaultCurrencySymbol = symbol || '$';
}

export function getDefaultCurrencySymbol(): string {
  return defaultCurrencySymbol;
}

export function formatMoney(
  value: number | string | null | undefined,
  withSymbol: boolean = true,
  fractionDigits: number = 2,
  currencySymbol?: string,
): string {
  if (value == null || value === '') {
    return '';
  }

  let parsed: number;

  if (typeof value === 'number') {
    parsed = value;
  } else {
    // Handle pre-formatted currency strings like "$936,940.59"
    const cleaned = value
      .replace(/^\$/, '')
      .replace(/^ZAR\s*/i, '')
      .replace(/^R\s*/i, '')
      .replace(/,/g, '');
    parsed = Number(cleaned);
  }

  if (!Number.isFinite(parsed)) {
    return '';
  }

  const isNegative = parsed < 0;
  const abs = Math.abs(parsed);

  const fixed = abs.toFixed(fractionDigits);
  const [intPartRaw, decPart] = fixed.split('.');

  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = decPart != null ? `${intPart}.${decPart}` : intPart;

  const sign = isNegative ? '-' : '';
  const symbol = withSymbol ? (currencySymbol ?? defaultCurrencySymbol) : '';

  return `${sign}${symbol}${formatted}`;
}

export function formatMoneyInText(
  text: string | null | undefined,
  withSymbol: boolean = true,
  fractionDigits: number = 2,
  currencySymbol?: string,
): string {
  if (!text) return '';

  // Match money values in text (currently supports $ and ZAR/R prefixes).
  return text
    .replace(/\$([\d,]+(?:\.\d{2})?)/g, (match, amountStr) => {
      const numericValue = parseFloat(amountStr.replace(/,/g, ''));
      if (!isNaN(numericValue) && numericValue >= 0) {
        return formatMoney(numericValue, withSymbol, fractionDigits, currencySymbol);
      }
      return match;
    })
    .replace(/\bZAR\s*([\d,]+(?:\.\d{2})?)\b/gi, (match, amountStr) => {
      const numericValue = parseFloat(amountStr.replace(/,/g, ''));
      if (!isNaN(numericValue) && numericValue >= 0) {
        return formatMoney(numericValue, withSymbol, fractionDigits, currencySymbol);
      }
      return match;
    })
    .replace(/\bR\s*([\d,]+(?:\.\d{2})?)\b/g, (match, amountStr) => {
      const numericValue = parseFloat(amountStr.replace(/,/g, ''));
      if (!isNaN(numericValue) && numericValue >= 0) {
        return formatMoney(numericValue, withSymbol, fractionDigits, currencySymbol);
      }
      return match;
    });
}

@Pipe({
  name: 'money',
  standalone: true,
})
export class MoneyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    withSymbol: boolean = true,
    fractionDigits: number = 2,
    currencySymbol?: string,
  ): string {
    return formatMoney(value, withSymbol, fractionDigits, currencySymbol);
  }
}

@Pipe({
  name: 'moneyInText',
  standalone: true,
})
export class MoneyInTextPipe implements PipeTransform {
  transform(
    text: string | null | undefined,
    withSymbol: boolean = true,
    fractionDigits: number = 2,
    currencySymbol?: string,
  ): string {
    return formatMoneyInText(text, withSymbol, fractionDigits, currencySymbol);
  }
}
