/** True when the document has the `dark` class (toggled by useTheme). */
export function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}
