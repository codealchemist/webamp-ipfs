import * as IPFS from 'ipfs'
import { CID } from 'multiformats/cid'
import mime from 'mime-types'
import Webamp from 'webamp'
import keys from './util/keys'
import getFileType from './util/get-file-type'
import getRandomImage from './util/get-random-image'

// document.addEventListener('DOMContentLoaded', init)

// Check if Winamp is supported in this browser
if (!Webamp.browserIsSupported()) {
  alert('Oh no! Webamp does not work!')
  throw new Error("What's the point of anything?")
}

const webampWindows = {
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
  }
}
const webamp = new Webamp({
  enableHotkeys: true,
  __initialWindowLayout: {
    ...webampWindows
  }
})

async function init () {
  const ipfs = await IPFS.create()
  const id = await ipfs.id()
  console.log('NODE ID', id)
  const $background = document.getElementById('background')
  const $input = document.getElementById('cid')
  const $loading = document.getElementById('loading')
  let hiddenLoadingText = true
  let loadingTextTimer
  let isLoading = false
  let loadingHash
  let alreadySetIpfsBackground = false

  setBackground()

  // Render Webamp.
  webamp.renderWhenReady(document.getElementById('winamp-container'))

  keys('#cid', 'Enter', () => {
    const cid = $input.value
    if (!cid) return
    load(cid)
  })

  function setBackground (img) {
    img = img || getRandomImage()
    $background.style.backgroundImage = `url(${img})`
  }

  function setLoading (percentage) {
    $loading.style.width = `${percentage}vw`
  }

  function showLoading () {
    isLoading = true
    loadingTextTimer = setTimeout(() => {
      hiddenLoadingText = false
      $loading.classList.add('init')
    }, 1000)
    $loading.style.opacity = '1'
  }

  function hideLoading () {
    isLoading = false
    $loading.style.opacity = '0'
    setTimeout(() => {
      $loading.style.width = '0vw'
    }, 500)
  }

  function setHistory (hash, partial = false) {
    window.history.pushState({}, null, hash)
  }

  async function load (hash) {
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

        // Audio file.
        if (getFileType(name) === 'audio') {
          console.log('Adding audio track...')
          webamp.appendTracks([
            {
              url,
              defaultName: name
            }
          ])
        }

        // Image file.
        if (getFileType(name) === 'image' && !alreadySetIpfsBackground) {
          console.log('Using background from IPFS', fileObj)
          setBackground(url)
          alreadySetIpfsBackground = true
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
  async function * loadItems (links) {
    while (links.length) {
      const link = links.pop()
      // console.log('LINK', link)
      const { Hash, Name, Tsize } = link
      const { type, url } = await loadData(Hash, Name)
      const item = { name: Name, hash: Hash, size: Tsize, type, url }
      yield item
    }
  }

  async function loadData (cid, name) {
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
    load(hash)
  }
}

init()
