export const MS_PER_MINUTE = 60000;
export const MS_PER_HOUR = 3600000;
export const MS_PER_DAY = 86400000;

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

export function msToParts(ms: number): DurationParts {
  const days = Math.floor(ms / MS_PER_DAY);
  const remainingAfterDays = ms % MS_PER_DAY;
  const hours = Math.floor(remainingAfterDays / MS_PER_HOUR);
  const remainingAfterHours = remainingAfterDays % MS_PER_HOUR;
  const minutes = Math.floor(remainingAfterHours / MS_PER_MINUTE);
  return { days, hours, minutes };
}

export function partsToMs(parts: DurationParts): number {
  return (
    parts.days * MS_PER_DAY +
    parts.hours * MS_PER_HOUR +
    parts.minutes * MS_PER_MINUTE
  );
}

export function formatDuration(ms: number): string {
  if (ms === 0) return "0m";

  const { days, hours, minutes } = msToParts(ms);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
}
