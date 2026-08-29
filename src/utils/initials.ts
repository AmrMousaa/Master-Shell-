export function initials(name?: string): string {
  if (!name) return 'AP';
  const chars = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '');
  return chars.join('') || 'AP';
}
