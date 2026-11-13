export const playerColors = [
  { value: 'red', label: 'Red', background: '#b92339', foreground: '#fff5f6' },
  {
    value: 'blue',
    label: 'Blue',
    background: '#2052b5',
    foreground: '#f3f7ff',
  },
  {
    value: 'green',
    label: 'Green',
    background: '#136b46',
    foreground: '#f1fff7',
  },
  {
    value: 'yellow',
    label: 'Yellow',
    background: '#f1ce53',
    foreground: '#29230e',
  },
  {
    value: 'orange',
    label: 'Orange',
    background: '#f29a50',
    foreground: '#302011',
  },
  {
    value: 'grape',
    label: 'Purple',
    background: '#7836a7',
    foreground: '#fcf5ff',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    background: '#67c9d4',
    foreground: '#102c31',
  },
  {
    value: 'pink',
    label: 'Pink',
    background: '#b22a6b',
    foreground: '#fff3fa',
  },
] as const;
export function getPlayerColor(color: string) {
  return (
    playerColors.find((playerColor) => playerColor.value === color) ??
    playerColors[1]
  );
}
export function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}
