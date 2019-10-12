import { Node } from '.'
import { Context } from '../context'

export class URL extends Node {
  eval(context: Context) {
    super.eval(context)

    let rootpath: string
    if (!this.evaluated) {
      // Add the rootpath if the URL requires a rewrite
      rootpath = this.root.fileInfo.path
      if (rootpath.constructor === String &&
        this.value.constructor === String &&
        context.pathRequiresRewrite(val.value)
      ) {
        if (!val.quote) {
          rootpath = escapePath(rootpath)
        }
        val.value = context.rewritePath(val.value, rootpath)
      } else {
        val.value = context.normalizePath(val.value);
      }

      // Add url args if enabled
      if (context.urlArgs) {
        if (!val.value.match(/^\s*data:/)) {
          const delimiter = val.value.indexOf('?') === -1 ? '?' : '&';
          const urlArgs = delimiter + context.urlArgs;
          if (val.value.indexOf('#') !== -1) {
              val.value = val.value.replace('#', `${urlArgs}#`);
          } else {
              val.value += urlArgs;
          }
        }
      }
    }

    return new URL(val, this.getIndex(), this.fileInfo(), true);
  }
}

URL.prototype.type = 'Url';

function escapePath(path) {
    return path.replace(/[\(\)'"\s]/g, match => `\\${match}`);
}
