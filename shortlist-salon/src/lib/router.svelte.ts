function read(): string {
  return location.hash.replace(/^#\/?/, '').replace(/\/+$/, '')
}
export const route = $state({ path: read() })

if (!location.hash || location.hash === '#' || location.hash === '#/') {
  history.replaceState(null, '', '#/books')
  route.path = 'books'
}
window.addEventListener('hashchange', () => {
  route.path = read()
  window.scrollTo(0, 0)
})
export const go = (p: string) => (location.hash = '#/' + p)
