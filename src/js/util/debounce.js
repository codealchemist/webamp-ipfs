export default function debounce(callback, ms=500) {
  let debounced = false
  return function debouncedCallback() {
    console.log('debouncedCallback called')
    if (debounced) return
    debounced = true
    callback(...arguments)
    setTimeout(() => debounced = false, ms)
  }
}
