import { Node, ILocationInfo, Expression, WS, Comment } from '../tree/nodes'
import { IToken } from 'chevrotain'

/**
 * Processes mixed whitespace / comments
 * from the CST and returns a Node
 */
export function processWS(token: IToken | IToken[], asArray: boolean = false): Node | Node[] | '' {
  if (!token) {
    return ''
  }
  const ws = Array.isArray(token) ? token[0] : token
  const payload = ws.payload
  const nodeColl: { node: Node | string; index: number }[] = []
  payload.forEach((match: { value: string; index: number }[], i: number) => {
    if (i === 0) {
      match.forEach(({ value, index }) => {
        nodeColl.push({ node: value, index })
      })
    } else if (i === 1) {
      match.forEach(({ value, index }) => {
        nodeColl.push({ node: new Comment(value), index })
      })
    } else if (i === 2) {
      match.forEach(({ value, index }) => {
        nodeColl.push({ node: new Comment(value, { isLineComment: true }), index })
      })
    }
  })
  nodeColl.sort((a, b) => {
    return a.index - b.index
  })

  const nodes = nodeColl.map(node => node.node)

  /** Attach white-space to comments */
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i]
    if (node.constructor === String) {
      const nextNode = <Node>nodes[i + 1]
      if (nextNode) {
        nextNode.pre = node
        nodes.splice(i--, 1)
      } else {
        const prevNode = <Node>nodes[i - 1]
        if (prevNode) {
          prevNode.post = node
          nodes.splice(i--, 1)
        } else {
          nodes[i] = new WS(node)
        }
      }
    }
  }

  if (asArray) {
    return <Node[]>nodes
  }

  if (nodes.length === 1) {
    return (<Node[]>nodes)[0]
  }

  return new Expression({ nodes: <Node[]>nodes })
}

export function collapseTokens(tokens: IToken[]): ILocationInfo & { image: string } {
  let image: string = ''
  const { startLine, startColumn, startOffset } = tokens[0]
  const { endLine, endColumn, endOffset } = tokens[tokens.length - 1]

  tokens.forEach(token => {
    image += token.image
  })

  return {
    image,
    startLine,
    startColumn,
    startOffset,
    endLine,
    endColumn,
    endOffset
  }
}

export function flatten(arr: any[]): any[] {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten)
  }, [])
}

export function spanNodes(node: Node | Node[]): { nodes: Node[]; location: ILocationInfo } {
  const nodes = Array.isArray(node) ? node : [node]
  const { startLine, startColumn, startOffset } = nodes[0]
  const { endLine, endColumn, endOffset } = nodes[nodes.length - 1]

  return {
    nodes,
    location: {
      startLine,
      startColumn,
      startOffset,
      endLine,
      endColumn,
      endOffset
    }
  }
}

export function isToken(value: any): value is IToken {
  return 'image' in value
}
