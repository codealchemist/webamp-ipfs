function getRandomImage () {
  const min = 1
  const max = 12
  const i = Math.floor(Math.random() * (max - min + 1)) + min
  const image = `/backgrounds/background${i}.jpg`)
  return image
}

export default getRandomImage
