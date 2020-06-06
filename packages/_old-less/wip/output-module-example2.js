import { tree } from 'less/blah'
const { rules, declaration } = tree
import _colorsless from 'colors.less'

export default (parent) => (
    rules([
        atrule({ name: '@charset', prelude: [value(' this is a value' )]}),
        _colorsless()
    ], {parent, isRoot: true})
)