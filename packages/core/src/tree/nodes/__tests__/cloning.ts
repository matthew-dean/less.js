import { expect } from 'chai'
import 'mocha'
import { Declaration, Value } from '..'

describe('Node cloning', () => {
  let val: Value
  let decl: Declaration
  let name
  let nodes
  let clone: Declaration

  beforeEach(() => {
    val = new Value('foo')
    decl = new Declaration({ name: 'prop', nodes: [val] })
    name = decl.name
    nodes = decl.nodes
  })

  it('should not mutate original', () => {
    clone = decl.clone()
    expect(decl.nodes).to.eq(nodes)
    expect(decl.name).to.eq(name)
  })

  it('should create new objects when deep cloning', () => {
    clone = decl.clone()
    expect(clone).to.not.eq(decl)
    expect(clone.name).to.not.eq(name)
    expect(clone.nodes).to.not.eq(nodes)
    expect(clone.nodes[0]).to.not.eq(val)
  })

  it('should copy new props', () => {
    decl.evaluatingName = true
    decl['arbitrary'] = 1
    clone = decl.clone()
    expect(clone.evaluatingName).to.eq(decl.evaluatingName)
    expect(clone['arbitrary']).to.eq(decl['arbitrary'])
  })

  it('should retain references when shallow cloning', () => {
    clone = decl.clone(true)
    expect(clone).to.not.eq(decl)
    expect(clone.name).to.eq(name)
    expect(clone.nodes).to.eq(nodes)
    expect(clone.nodes[0]).to.eq(val)
  })
})