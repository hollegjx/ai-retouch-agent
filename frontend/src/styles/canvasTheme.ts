/** Konva 需要实际色值，从同一份 CSS token 读取，避免画布与界面主题分叉。 */
function color(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
}
export const canvasTheme = {
  get ink() {
    return color('--ink')
  },
  get muted() {
    return color('--muted')
  },
  get selection() {
    return color('--canvas-selection')
  },
  get handle() {
    return color('--canvas-handle')
  },
  get scrim() {
    return color('--canvas-scrim')
  },
}
