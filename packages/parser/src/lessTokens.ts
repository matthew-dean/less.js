import {
  Fragments as CSSFragments,
  Tokens as CSSTokens,
  rawTokenConfig,
  LexerType,
  groupCapture
} from '@less/css-parser'

interface IMerges {
  [key: string]: rawTokenConfig[]
}

export const Fragments = [...CSSFragments]
export let Tokens = [...CSSTokens]

Fragments.unshift(['lineComment', '\\/\\/[^\\n\\r]*'])
// Fragments.push(['interpolated', '({{ident}}|[@$]\\{{{ident}}\\})+'])

Fragments.forEach(fragment => {
  if (fragment[0].indexOf('wsorcomment') !== -1) {
    fragment[1] = '(?:({{ws}})|({{comment}})|({{lineComment}}))'
  }
})

/** Keyed by what to insert after */
const merges: IMerges = {
  PropertyName: [{ name: 'Interpolated', pattern: LexerType.NA }],
  Assign: [
    { name: 'Ampersand', pattern: /&/, categories: ['Selector'] },
    { name: 'Ellipsis', pattern: /\.\.\./ }
  ],
  PlainIdent: [
    // {
    //   name: 'InterpolatedIdent',
    //   pattern: '{{interpolated}}',
    //   categories: ['Interpolated']
    // },
    { name: 'InterpolatedStart', pattern: /[@$]\{/, categories: ['Interpolated'] },
    /** Removed in v4 */
    // { name: 'InterpolatedSelectorStart', pattern: /[\.#][@$]\{/, categories: ['Interpolated'] },
    { name: 'PlusAssign', pattern: /\+:/, categories: ['BlockMarker', 'Assign'] },
    { name: 'UnderscoreAssign', pattern: /_:/, categories: ['BlockMarker', 'Assign'] },
    // {
    //   name: 'Extend',
    //   pattern: /extend\(/,
    //   categories: ['BlockMarker', 'Function']
    // },
    {
      name: 'When',
      pattern: /when/,
      longer_alt: 'PlainIdent',
      categories: ['Ident']
    },
    {
      name: 'VarOrProp',
      pattern: LexerType.NA
    },
    {
      name: 'NestedReference',
      pattern: ['([@$]+{{ident}}?){2,}', groupCapture],
      start_chars_hint: ['@', '$'],
      categories: ['VarOrProp']
    },
    {
      name: 'PropertyReference',
      pattern: '\\${{ident}}',
      categories: ['VarOrProp']
    }
  ],
  AtMedia: [
    {
      name: 'AtPlugin',
      pattern: /@plugin/,
      longer_alt: 'AtKeyword',
      categories: ['BlockMarker', 'AtName']
    }
  ],
  Uri: [
    {
      name: 'LineComment',
      pattern: '{{lineComment}}',
      group: LexerType.SKIPPED,
      longer_alt: 'WS'
    }
  ]
}

let tokenLength = Tokens.length
for (let i = 0; i < tokenLength; i++) {
  let token = Tokens[i]
  let { name, categories } = token
  const copyToken = () => {
    token = { ...token }
    categories = categories ? categories.slice(0) : []
  }
  let alterations = true

  switch (name) {
    case 'Divide':
      copyToken()
      token.pattern = /\.?\//
      break
    case 'StringLiteral':
      copyToken()
      token.pattern = '~?{{string1}}|~?{{string2}}'
      break
    case 'AtKeyword':
      copyToken()
      token.categories = categories.concat(['VarOrProp'])
      break
    // case 'Interpolated':
    //   copyToken()
    //   token.pattern = LexerType.NA
    //   break
    // case 'DotName':
    //   copyToken()
    //   token.pattern = '\\.{{interpolated}}'
    //   break
    // case 'HashName':
    //   copyToken()
    //   token.pattern = '#{{interpolated}}'
    //   break
    // case 'PlainIdent':
    // case 'AttrFlag':
    // case 'And':
    // case 'Or':
    // case 'Not':
    // case 'Only':
    //   copyToken()
    //   token.categories = categories.concat(['Ident', 'Interpolated'])
    //   break
    default:
      alterations = false
  }
  if (alterations) {
    Tokens[i] = token
  }
  const merge = merges[name]
  if (merge) {
    /** Insert after current token */
    Tokens = Tokens.slice(0, i + 1).concat(merge, Tokens.slice(i + 1))
    const mergeLength = merge.length
    tokenLength += mergeLength
    i += mergeLength
  }
}
