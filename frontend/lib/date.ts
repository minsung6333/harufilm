const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = DAY_KO[d.getDay()];
  return `${month}월 ${day}일 ${dow}요일`;
}

export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split("-").map(Number);
  return `${month}월 ${day}일`;
}
