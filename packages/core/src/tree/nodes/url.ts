import { Context, Node, Value, Quoted } from '.'

/**
 * A Url node contains a single Value or Quoted node
 */
export class Url extends Node {
  nodes: [Value | Quoted]

  eval(context: Context) {
    super.eval(context)

    if (!this.evaluated) {
      let rootpath: string
      const url = this.nodes[0].clone()
      // Add the rootpath if the URL requires a rewrite
      rootpath = this.root.fileInfo.path
      if (
        rootpath.constructor === String
        && this.value.constructor === String
        && context.pathRequiresRewrite(url.value)
      ) {
        if (url instanceof Value) {
          rootpath = escapePath(rootpath)
        }
        url.value = context.rewritePath(url.value, rootpath)
      } else {
        url.value = context.environment.normalizePath(url.value)
      }

      let urlArgs = context.options.urlArgs
      // Add url args if enabled
      if (urlArgs) {
        if (!url.value.match(/^\s*data:/)) {
          const delimiter = url.value.indexOf('?') === -1 ? '?' : '&'
          urlArgs = delimiter + urlArgs
          if (url.value.indexOf('#') !== -1) {
            url.value = url.value.replace('#', `${urlArgs}#`)
          } else {
            url.value += urlArgs
          }
        }
      }
      const node = this.clone(true)
      node.nodes[0] = url
      return node
    }

    return this
  }
}

Url.prototype.type = 'Url'

function escapePath(path: string) {
  return path.replace(/[\(\)'"\s]/g, match => `\\${match}`)
}
