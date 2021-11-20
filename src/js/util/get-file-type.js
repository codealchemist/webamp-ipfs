const fileExtMap = {
  audio: /(mp3|ogg|wav|flac)$/i,
  video: /(mp4|webm|avi|ogv)$/i,
  text: /(txt|md|html|htm|xml|js|css|scss|yml|yaml|json|php|perl|py|sh)$/i,
  image: /(png|jpg|jpeg|gif|webp)$/i
}
const types = Object.keys(fileExtMap)

function getFileType (filename) {
  let fileType
  types.some(type => {
    const regex = fileExtMap[type]
    if (filename.match(regex)) {
      fileType = type
      return true
    }
    return
  })

  return fileType
}

export default getFileType
