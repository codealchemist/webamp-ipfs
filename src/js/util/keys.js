const map = {}
window.keyMap = map

export default function keys (selector, key, callback) {
  map[selector] = map[selector] || {}
  map[selector].keys = map[selector].keys || {}
  map[selector].keys[key] = map[selector].keys[key] || []
  map[selector].keys[key].push(callback)

  if (!map[selector].listener) {
    try {
      const $el = document.querySelector(selector)
      map[selector].listener = true
      $el.addEventListener('keydown', event => {
        const pressedKey = event.key || event.code
        // console.log(`PRESSED ${pressedKey}` )
        if (!map[selector].keys[pressedKey]) return

        console.log(map[selector])
        map[selector].keys[pressedKey].map(currentCallback => currentCallback())
      })
    } catch (error) {
      console.log('ERROR on keys function:', error)
    }
  }
}
