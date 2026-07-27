export function withHiddenNavbar(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}hidenavbar=true`;
}
