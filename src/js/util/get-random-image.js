function getRandomImage () {
  const min = 1
  const max = 12
  const i = Math.floor(Math.random() * (max - min + 1)) + min
  const baseUrl =
    'https://gateway.pinata.cloud/ipfs/Qmc6gvh1xrKaEsc11DYPxQCAqCShhD4AYwD37CjvxGBimm'
  const image = `${baseUrl}/backgrounds/background${i}.jpg`
  return image
}

export default getRandomImage
