import { reportWithSuppression } from './suppressions.mjs'

const USER_ROOTS = new Set([
  'props',
  'state',
  'event',
  'e',
  'location',
  'hash',
  'search',
  'storage',
  'localStorage',
  'sessionStorage',
  'clipboard',
  'navigator',
  'file',
  'blob',
  'camera',
  'gallery',
  'bridge',
  'Capacitor',
  'JSON',
])

const USER_NAMES = new Set([
  'userInput',
  'userValue',
  'rawHtml',
  'html',
  'payload',
  'query',
  'param',
  'params',
  'searchParams',
  'hrefValue',
  'externalUrl',
  'untrusted',
  'unsafeCode',
  'safeCode',
])

function propertyName(node) {
  if (!node) return ''
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal' || node.type === 'StringLiteral') return String(node.value)
  return ''
}

function isStringLiteral(node) {
  return Boolean(
    node &&
      (node.type === 'Literal' || node.type === 'StringLiteral') &&
      typeof node.value === 'string',
  )
}

function isStaticString(node) {
  if (isStringLiteral(node)) return true
  return Boolean(
    node &&
      node.type === 'TemplateLiteral' &&
      node.expressions.length === 0 &&
      node.quasis.length === 1,
  )
}

function stringValue(node) {
  if (isStringLiteral(node)) return node.value
  if (node?.type === 'TemplateLiteral' && node.quasis.length === 1) return node.quasis[0].value.cooked
  return null
}

function isExternalUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function isJavascriptUrl(value) {
  return typeof value === 'string' && /^\s*javascript:/i.test(value)
}

function isUserRoot(node) {
  if (!node) return false
  if (node.type === 'Identifier') return USER_ROOTS.has(node.name) || USER_NAMES.has(node.name)
  if (node.type === 'MemberExpression') {
    const object = node.object
    return Boolean(
      (object?.type === 'Identifier' && object.name === 'window' && propertyName(node.property) === 'location') ||
        (object?.type === 'Identifier' && object.name === 'document' && propertyName(node.property) === 'location'),
    )
  }
  return false
}

function isUserCall(callee) {
  if (!callee) return false
  if (callee.type === 'Identifier') {
    return ['parse', 'atob', 'decodeURIComponent', 'readAsText'].includes(callee.name)
  }
  if (callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression') {
    const object = callee.object?.name
    const property = propertyName(callee.property)
    if (object === 'URL' && property === 'createObjectURL') return true
    if (object === 'navigator' && property === 'clipboard') return true
    if (object === 'JSON' && property === 'parse') return true
  }
  return false
}

function isUserControlled(node, depth = 0) {
  if (!node || depth > 12) return false
  if (isUserRoot(node)) return true

  switch (node.type) {
    case 'Identifier':
      return USER_NAMES.has(node.name)
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      return (
        isUserControlled(node.object, depth + 1) ||
        isUserControlled(node.property, depth + 1)
      )
    case 'CallExpression':
    case 'OptionalCallExpression':
      return (
        isUserCall(node.callee) ||
        node.arguments.some((argument) => isUserControlled(argument, depth + 1))
      )
    case 'TemplateLiteral':
      return node.expressions.some((expression) => isUserControlled(expression, depth + 1))
    case 'BinaryExpression':
    case 'LogicalExpression':
      return (
        isUserControlled(node.left, depth + 1) || isUserControlled(node.right, depth + 1)
      )
    case 'ConditionalExpression':
      return (
        isUserControlled(node.test, depth + 1) ||
        isUserControlled(node.consequent, depth + 1) ||
        isUserControlled(node.alternate, depth + 1)
      )
    case 'ArrayExpression':
      return (node.elements ?? []).some((element) => isUserControlled(element, depth + 1))
    case 'ObjectExpression':
      return (node.properties ?? []).some((property) =>
        isUserControlled(property.value ?? property.argument, depth + 1),
      )
    case 'JSXExpressionContainer':
      return isUserControlled(node.expression, depth + 1)
    case 'UnaryExpression':
    case 'AwaitExpression':
    case 'SpreadElement':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return isUserControlled(node.argument ?? node.expression, depth + 1)
    case 'AssignmentExpression':
      return isUserControlled(node.right, depth + 1)
    default:
      return false
  }
}

function flag(context, node, ruleId, messageId, data = {}) {
  reportWithSuppression(context, node, ruleId, { messageId, data })
}

function attributeValue(attribute) {
  if (!attribute?.value) return null
  if (attribute.value.type === 'Literal' || attribute.value.type === 'StringLiteral') {
    return String(attribute.value.value)
  }
  if (attribute.value.type === 'JSXExpressionContainer') {
    return stringValue(attribute.value.expression)
  }
  return null
}

function isFunctionArgument(node) {
  if (!node) return false
  return ['FunctionExpression', 'ArrowFunctionExpression', 'Identifier'].includes(node.type)
}

const EXPIRED = {
  expiredSuppression: 'Suppression for {{ruleId}} expired on {{expires}}; renew it or fix the finding',
}

const noDangerousHtml = {
  meta: {
    type: 'problem',
    docs: { description: 'Block dangerous HTML assignment sinks' },
    schema: [],
    messages: {
      ...EXPIRED,
      dangerousHtml: 'Dangerous HTML sink requires a pinned local sanitiser and a documented justification',
    },
  },
  create(context) {
    const ruleId = 'plantjes/no-dangerous-html'
    return {
      JSXAttribute(node) {
        if (node.name?.name !== 'dangerouslySetInnerHTML') return
        const expression = node.value?.expression
        const htmlProperty = expression?.properties?.find(
          (property) => propertyName(property.key) === '__html',
        )
        const value = htmlProperty?.value
        if (!value || !isStaticString(value)) {
          flag(context, node, ruleId, 'dangerousHtml')
        }
      },
      AssignmentExpression(node) {
        const left = node.left
        if (left?.type !== 'MemberExpression' && left?.type !== 'OptionalMemberExpression') return
        if (!['innerHTML', 'outerHTML', 'srcdoc'].includes(propertyName(left.property))) return
        if (!isStaticString(node.right)) flag(context, node, ruleId, 'dangerousHtml')
      },
      CallExpression(node) {
        const callee = node.callee
        if (callee?.type !== 'MemberExpression' && callee?.type !== 'OptionalMemberExpression') return
        const object = callee.object?.name
        const property = propertyName(callee.property)
        if (property === 'insertAdjacentHTML' && !isStaticString(node.arguments[1])) {
          flag(context, node, ruleId, 'dangerousHtml')
        }
        if (object === 'document' && ['write', 'writeln'].includes(property) && !isStaticString(node.arguments[0])) {
          flag(context, node, ruleId, 'dangerousHtml')
        }
      },
    }
  },
}

const noDynamicCode = {
  meta: {
    type: 'problem',
    docs: { description: 'Block eval, Function and string-valued timers' },
    schema: [],
    messages: {
      ...EXPIRED,
      dynamicCode: 'Dynamic code execution is forbidden; use a static function or literal instead',
      stringTimer: 'Timers must use a function, not a string',
    },
  },
  create(context) {
    const ruleId = 'plantjes/no-dynamic-code'
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee?.type === 'Identifier' && callee.name === 'eval') {
          flag(context, node, ruleId, 'dynamicCode')
          return
        }
        if (
          callee?.type === 'Identifier' &&
          ['setTimeout', 'setInterval'].includes(callee.name)
        ) {
          const first = node.arguments[0]
          if (isStringLiteral(first)) {
            flag(context, node, ruleId, 'stringTimer')
          } else if (!isFunctionArgument(first) && isUserControlled(first)) {
            flag(context, node, ruleId, 'dynamicCode')
          }
        }
      },
      NewExpression(node) {
        if (node.callee?.type === 'Identifier' && node.callee.name === 'Function') {
          flag(context, node, ruleId, 'dynamicCode')
        }
      },
    }
  },
}

const noDynamicImport = {
  meta: {
    type: 'problem',
    docs: { description: 'Block dynamic import of non-literal module specifiers' },
    schema: [],
    messages: {
      ...EXPIRED,
      dynamicImport: 'Dynamic import requires a literal module specifier',
    },
  },
  create(context) {
    const ruleId = 'plantjes/no-dynamic-import'
    const check = (node, source) => {
      if (!isStaticString(source)) flag(context, node, ruleId, 'dynamicImport')
    }
    return {
      ImportExpression(node) {
        check(node, node.source)
      },
      CallExpression(node) {
        if (node.callee?.type === 'Import') check(node, node.arguments[0])
      },
    }
  },
}

const noUnsafeNavigation = {
  meta: {
    type: 'problem',
    docs: { description: 'Block external navigation, remote assets and unsafe WebView sinks' },
    schema: [],
    messages: {
      ...EXPIRED,
      unsafeNavigation: 'Unsafe navigation, remote asset load or wildcard postMessage target',
      unsafeTarget: 'target="_blank" requires rel="noopener noreferrer"',
    },
  },
  create(context) {
    const ruleId = 'plantjes/no-unsafe-navigation'
    const unsafeValue = (node) => {
      const value = stringValue(node)
      return isJavascriptUrl(value) || isExternalUrl(value) || isUserControlled(node)
    }

    return {
      JSXAttribute(node) {
        const name = node.name?.name
        if (name === 'href' || name === 'src') {
          const value = attributeValue(node)
          if (isJavascriptUrl(value) || isExternalUrl(value)) {
            flag(context, node, ruleId, 'unsafeNavigation')
          }
        }
        if (name === 'target' && attributeValue(node) === '_blank') {
          const opening = node.parent
          const rel = (opening?.attributes ?? []).find((attribute) => attribute.name?.name === 'rel')
          const relValue = rel ? attributeValue(rel) ?? '' : ''
          if (!rel || !relValue.includes('noopener') || !relValue.includes('noreferrer')) {
            flag(context, node, ruleId, 'unsafeTarget')
          }
        }
      },
      CallExpression(node) {
        const callee = node.callee
        const isOpen =
          (callee?.type === 'Identifier' && callee.name === 'open') ||
          (callee?.type === 'MemberExpression' && propertyName(callee.property) === 'open' && callee.object?.name === 'window')
        if (isOpen && node.arguments[0] && unsafeValue(node.arguments[0])) {
          flag(context, node, ruleId, 'unsafeNavigation')
          return
        }
        const isLocationObject =
          callee?.object?.name === 'location' ||
          (callee?.object?.type === 'MemberExpression' &&
            propertyName(callee.object.property) === 'location')
        const isLocationCall =
          callee?.type === 'MemberExpression' &&
          propertyName(callee.property) === 'assign' &&
          isLocationObject
        const isLocationReplace =
          callee?.type === 'MemberExpression' &&
          propertyName(callee.property) === 'replace' &&
          isLocationObject
        if ((isLocationCall || isLocationReplace) && node.arguments[0] && unsafeValue(node.arguments[0])) {
          flag(context, node, ruleId, 'unsafeNavigation')
          return
        }
        const isPostMessage = callee?.type === 'MemberExpression' && propertyName(callee.property) === 'postMessage'
        if (isPostMessage) {
          const target = node.arguments[1]
          if ((isStringLiteral(target) && target.value === '*') || isUserControlled(target)) {
            flag(context, node, ruleId, 'unsafeNavigation')
          }
        }
      },
      AssignmentExpression(node) {
        const left = node.left
        if (left?.type !== 'MemberExpression' && left?.type !== 'OptionalMemberExpression') return
        const isHref = propertyName(left.property) === 'href'
        const isLocation = isUserRoot(left.object)
        if (isHref && isLocation && unsafeValue(node.right)) {
          flag(context, node, ruleId, 'unsafeNavigation')
        }
      },
    }
  },
}

export const securityPlugin = {
  meta: { name: 'plantjes-security-lint', version: '1.0.0' },
  rules: {
    'no-dangerous-html': noDangerousHtml,
    'no-dynamic-code': noDynamicCode,
    'no-dynamic-import': noDynamicImport,
    'no-unsafe-navigation': noUnsafeNavigation,
  },
}

export default securityPlugin
