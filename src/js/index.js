import * as IPFS from 'ipfs'
import { CID } from 'multiformats/cid'
import mime from 'mime-types'
import Webamp from 'webamp'
import keys from './util/keys'
import getFileType from './util/get-file-type'

console.log('Wait for DOM...')
document.addEventListener('DOMContentLoaded', init)

// Check if Winamp is supported in this browser
if (!Webamp.browserIsSupported()) {
  alert('Oh no! Webamp does not work!')
  throw new Error("What's the point of anything?")
}
const webamp = new Webamp({
  enableHotkeys: true,
  __initialWindowLayout: {
    main: {
      position: { x: -275, y: 0 }
    },
    equalizer: {
      open: false,
      hidden: false,
      shade: false,
      position: { x: -275, y: 116 }
    },
    playlist: {
      open: true,
      doubled: true,
      position: { x: 0, y: 0 },
      size: [0, 4]
    },
    milkdrop: {}
  }
})
window.webamp = webamp

async function init() {
  const ipfs = await IPFS.create()
  const id = await ipfs.id()
  console.log('NODE ID', id)
  const $input = document.getElementById('cid')
  const $inputContainer = document.getElementById('input-container')
  const $container = document.getElementById('container')
  const $content = document.getElementById('content')
  const $iframe = document.getElementById('inline-content')
  const $loading = document.getElementById('loading')
  let hiddenLoadingText = true
  let loadingTextTimer
  const inlineContentStartWidth = 1024 // Start displaying inline content at 800px
  let isLoading = false
  let loadingHash

  // Render Webamp.
  webamp.renderWhenReady(document.getElementById('winamp-container'))

  keys('#cid', 'Enter', () => {
    const cid = $input.value
    if (!cid) return
    showContentView()
    load(cid)
  })

  keys('body', 'Escape', () => {
    resetView()
  })

  function openContent({ url, name, size }) {
    console.log('Open content', window.innerWidth, inlineContentStartWidth)
    // Open in new window.
    if (window.innerWidth < inlineContentStartWidth) {
      console.log('Open URL in new window')
      window.open(url)
      return
    }

    // Display inline content.
    $iframe.onload = () => {
      const $iframeBody = $iframe.contentWindow.document.querySelector('body')
      $iframeBody.style.color = '#ddd'
    }
    $iframe.src = url
    showInlineContent()
  }

  function showInlineContent() {
    $container.classList.add('inline-content')
  }

  function hideInlineContent() {
    $container.classList.remove('inline-content')
  }

  function showContentView() {
    $content.classList.add('show')
    $content.classList.remove('hide')
    $inputContainer.classList.add('hide')
    $inputContainer.classList.remove('show')
  }

  function resetView() {
    hideInlineContent()
    $content.innerHTML = '' // Clear content.
    $content.classList.add('hide')
    $content.classList.remove('show')
    $inputContainer.classList.add('show')
    $inputContainer.classList.remove('hide')
  }

  function setLoading(percentage) {
    $loading.style.width = `${percentage}vw`
  }

  function showLoading() {
    isLoading = true
    loadingTextTimer = setTimeout(() => {
      hiddenLoadingText = false
      $loading.classList.add('init')
    }, 1000)
    $loading.style.opacity = '1'
  }

  function hideLoading() {
    isLoading = false
    $loading.style.opacity = '0'
    setTimeout(() => {
      $loading.style.width = '0vw'
    }, 500)
  }

  function setHistory(hash, partial = false) {
    window.history.pushState(
      { content: $content.innerHTML, partial, hash },
      null,
      hash
    )
  }

  async function load(hash) {
    if (isLoading) hideLoading()

    console.log(`Loading ${hash}...`)
    const cid = CID.parse(hash)
    const node = await ipfs.dag.get(cid)
    console.log('NODE', node)
    const { Links } = node.value
    console.log('LINKS', Links)
    const total = Links.length
    let loadedItems = 0
    showLoading()
    for await (const fileObj of loadItems(Links)) {
      let item
      const { url, name, size } = fileObj
      if (url) {
        // File.
        console.log('GOT FILE', fileObj)
        if (getFileType(name) === 'audio') {
          console.log('Adding audio track...')
          webamp.appendTracks([
            {
              url,
              defaultName: name
            }
          ])
        }
      } else {
        // Dir.
        // TODO: Iterate to get all audio files?
        console.log('GOT DIR', fileObj)
      }

      loadedItems += 1
      const percentage = Math.round((loadedItems * 100) / total)
      setLoading(percentage)

      // Hide loading text.
      if (!hiddenLoadingText) {
        clearTimeout(loadingTextTimer)
        $loading.classList.remove('init')
      }
    }
    hideLoading()
    setHistory(hash)
  }

  // Load files and dirs.
  async function* loadItems(links) {
    while (links.length) {
      const link = links.pop()
      // console.log('LINK', link)
      const { Hash, Name, Tsize } = link
      const { type, url } = await loadData(Hash, Name)
      const item = { name: Name, hash: Hash, size: Tsize, type, url }
      yield item
    }
  }

  async function loadData(cid, name) {
    try {
      const stream = await ipfs.cat(cid)
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const mimeType = mime.lookup(name)
      const blob = new Blob(chunks, { type: mimeType })
      const url = URL.createObjectURL(blob)
      return {
        url,
        type: 'file'
      }
    } catch (error) {
      // Generic error.
      if (!error.toString().match('is a directory')) {
        console.log(`ERROR loading file: ${name} / ${cid}`, error)
        return
      }

      // Return directory.
      return {
        type: 'directory'
      }
    }
  }

  // Read hash from URL.
  const hash = window.location.pathname.replace('/', '')
  if (hash) {
    console.log(`Auto loading hash: ${hash}`)
    showContentView()
    load(hash)
  }
}
