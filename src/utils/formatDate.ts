export default function formatDate(d: Date) {
  return [
    d.getDate(),
    '-',
    d.getMonth(),
    '-',
    d.getFullYear(),
    ' ',
    d.getHours(),
    ':',
    d.getMinutes(),
    ':',
    d.getSeconds()
  ].join('');
}
