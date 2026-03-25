import { Pipe, PipeTransform } from '@angular/core';

export function formatMoney(
  value: number | string | null | undefined,
  withSymbol: boolean = true,
  fractionDigits: number = 2,
): string {
  if (value == null || value === '') {
    return '';
  }

  let parsed: number;

  if (typeof value === 'number') {
    parsed = value;
  } else {
    // Handle pre-formatted currency strings like "$936,940.59"
    const cleaned = value.replace(/^\$/, '').replace(/,/g, '');
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
  const symbol = withSymbol ? '$' : '';

  return `${sign}${symbol}${formatted}`;
}

export function formatMoneyInText(
  text: string | null | undefined,
  withSymbol: boolean = true,
  fractionDigits: number = 2,
): string {
  if (!text) return '';
  
  // Match dollar amounts with commas: $1,234.56 or $12,345.67
  return text.replace(/\$([\d,]+(?:\.\d{2})?)/g, (match, amountStr) => {
    const numericValue = parseFloat(amountStr.replace(/,/g, ''));
    if (!isNaN(numericValue) && numericValue >= 0) {
      return formatMoney(numericValue, withSymbol, fractionDigits);
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
  ): string {
    return formatMoney(value, withSymbol, fractionDigits);
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
  ): string {
    return formatMoneyInText(text, withSymbol, fractionDigits);
  }
}
