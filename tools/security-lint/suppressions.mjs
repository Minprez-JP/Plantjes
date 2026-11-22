const SUPPRESSION_RE = /plantjes-suppress\s+([A-Za-z0-9/_-]+)\s+owner=(\S+)\s+reason="([^"]+)"\s+expires=(\d{4}-\d{2}-\d{2})/

function parseSuppression(comment, ruleId) {
  const match = SUPPRESSION_RE.exec(comment.value)
  if (!match || match[1] !== ruleId) return null
  return { owner: match[2], reason: match[3], expires: match[4] }
}

export function reportWithSuppression(context, node, ruleId, report) {
  const source = context.sourceCode ?? context.getSourceCode()
  const line = node.loc?.start?.line
  const comments = source?.getAllComments() ?? []

  for (const comment of comments) {
    const commentLine = comment.loc?.end?.line
    if (commentLine !== line && commentLine !== line - 1) continue

    const suppression = parseSuppression(comment, ruleId)
    if (!suppression) continue

    const expiry = new Date(`${suppression.expires}T00:00:00Z`)
    if (Number.isNaN(expiry.getTime()) || expiry < new Date()) {
      context.report({
        node,
        messageId: 'expiredSuppression',
        data: { ruleId, expires: suppression.expires },
      })
      return
    }

    // Valid, unexpired, rule-specific suppression: do not report this finding.
    return
  }

  context.report({ node, ...report })
}
