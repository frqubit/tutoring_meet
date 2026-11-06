export function pad2zeros(num: number): string {
  return num < 10 ? '0' + num : `${num}`;
}
