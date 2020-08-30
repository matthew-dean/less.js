import { ParseTree } from './render-tree'
import { ParseOptions } from './types'
import Environment from './environment/environment'
import { Less } from './index'
import { Node } from './tree/nodes'
import AssetManager from './asset-manager'

/** @todo - refine callback definition */
export type RenderFunction = (
  input: string,
  options?: ParseOptions,
  callback?: Function
) => Promise<any>

export const render: RenderFunction = function (
  this: Less,
  input: string,
  options?: ParseOptions,
  callback?: Function
): Promise<any> {
  if (!callback) {
    return new Promise((resolve, reject) => {
      render.call(this, input, options, (err: Error, output) => {
        if (err) {
          reject(err)
        } else {
          resolve(output)
        }
      })
    })
  } else {
    this.parse(input, options, (err: Error, root: Node, assetManager, options) => {
      if (err) {
        return callback(err)
      }

      let result
      try {
        const parseTree = new ParseTree(root, imports)
        result = parseTree.toCSS(options)
      } catch (err) {
        return callback(err)
      }

      callback(null, result)
    })
  }
}
