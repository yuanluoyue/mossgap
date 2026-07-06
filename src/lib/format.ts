/** 格式化日期为中文简短格式（YYYY-MM-DD）。 */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

/** 格式化日期时间（YYYY-MM-DD HH:mm）。 */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = formatDate(iso);
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${date} ${h}:${min}`;
  } catch {
    return iso;
  }
}

/** 格式化数字（千分位）。 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("zh-CN").format(n);
}
