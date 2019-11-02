import { Quoted, Value, Url } from '../tree/nodes'
import { define } from './helpers'
import { RewriteUrlMode } from '../constants'

const fallback = (value: string) => new Url([new Quoted(value)])

export default {
  'data-uri': define(function (mimeType: Value, filePath?: Value) {
    const { environment, options } = this

    if (!filePath) {
      filePath = mimeType
      mimeType = undefined
    }

    let mime = mimeType && mimeType.value
    let path = filePath.value

    const currentFileInfo
      = this.options.rewriteUrls == RewriteUrlMode.ALL
        ? this.currentNode.fileRoot.fileInfo
        : this.currentNode.root.fileInfo

    const currentDirectory = currentFileInfo.path

    const fragmentStart = path.indexOf('#')
    let fragment = ''
    if (fragmentStart !== -1) {
      fragment = path.slice(fragmentStart)
      path = path.slice(0, fragmentStart)
    }

    const fileManager = environment.getFileManager(path, currentDirectory, options)

    if (!fileManager) {
      return fallback(path)
    }

    let useBase64 = false

    // detect the mimetype if not given
    if (!mime) {
      mime = environment.mimeLookup(path)

      if (mime === 'image/svg+xml') {
        useBase64 = false
      } else {
        // use base 64 unless it's an ASCII or UTF-8 format
        const charset = environment.charsetLookup(mime)
        useBase64 = ['US-ASCII', 'UTF-8'].indexOf(charset) < 0
      }
      if (useBase64) {
        mime += ';base64'
      }
    } else {
      useBase64 = /;base64$/.test(mime)
    }

    const fileSync = fileManager.loadFileSync(path, currentDirectory, options, environment)
    if (!fileSync.contents) {
      this.currentNode.warn(this, `Skipped data-uri embedding of ${path} because file not found`)
      return fallback(path || mime)
    }
    let buf = fileSync.contents

    if (useBase64 && !environment.encodeBase64) {
      return fallback(path)
    }

    buf = useBase64 ? environment.encodeBase64(buf) : encodeURIComponent(buf)

    const uri = `data:${mime},${buf}${fragment}`

    return new Url([new Quoted(uri)])
  }, [Value], [Value, undefined])
}
