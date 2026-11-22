type Props = { note: string }

export function PositiveFixture(props: Props) {
  const el = document.createElement('div')
  el.innerHTML = '<b>static</b>'

  const html = <div dangerouslySetInnerHTML={{ __html: '<i>static</i>' }} />
  setTimeout(() => props.note.trim(), 10)
  const mod = import('./local.js')

  const link = <a href="/help" target="_blank" rel="noopener noreferrer">Help</a>
  const image = <img src="/local.png" />
  location.assign('/home')
  window.postMessage({ ok: true }, 'https://app.local')

  // plantjes-suppress plantjes/no-dynamic-code owner=maintainer reason="fixture" expires=2099-01-01
  eval('safe')

  return { html, mod, link, image, el }
}
