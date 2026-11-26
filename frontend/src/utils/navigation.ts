/** 只允许同源应用内路径，避免登录回跳至外部站点或再次进入登录页。 */
export function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return '/create'
  try {
    const parsed = new URL(value, window.location.origin)
    if (parsed.origin !== window.location.origin || parsed.pathname === '/auth') return '/create'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/create'
  }
}
