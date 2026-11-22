type Props = { note: string; href: string }

export function NegativeFixture(props: Props) {
  const el = document.createElement('div')
  el.innerHTML = props.note
  el.outerHTML = props.note
  el.insertAdjacentHTML('beforeend', props.note)
  document.write(props.note)

  const html = <div dangerouslySetInnerHTML={{ __html: props.note }} />
  eval(props.note)
  new Function(props.note)
  setTimeout('alert(1)', 10)
  const mod = import(props.note)

  const link = <a href="javascript:alert(1)" target="_blank">unsafe</a>
  const remote = <img src="https://example.com/a.png" />
  window.open(props.href)
  location.assign(props.href)
  window.postMessage(props.note, '*')

  // plantjes-suppress plantjes/no-dangerous-html owner=maintainer reason="expired fixture" expires=2020-01-01
  el.innerHTML = props.note

  return { html, mod, link, remote }
}
