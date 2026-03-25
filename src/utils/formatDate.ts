import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  const date = parseISO(dateStr);
  if (!isValid(date)) return "Invalid date";
  return format(date, "MMM d, yyyy");
}

export function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  const date = parseISO(dateStr);
  if (!isValid(date)) return "Invalid date";
  return formatDistanceToNow(date, { addSuffix: true });
}
