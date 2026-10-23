// SQL → MongoDB (mongosh syntax). Handles SELECT (columns, WHERE, ORDER BY, LIMIT/OFFSET,
// DISTINCT, COUNT, GROUP BY with aggregates and HAVING), INSERT, UPDATE and DELETE on one
// table. Joins and subqueries are reported as unsupported rather than guessed.

export class SqlError extends Error {}

const KEYWORDS = new Set(['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE', 'BETWEEN', 'IS', 'NULL', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING', 'AS', 'DISTINCT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'TRUE', 'FALSE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'UNION'])

export function tokenize(sql) {
  const tokens = []
  const re = /\s+|--[^\n]*|\/\*[\s\S]*?\*\/|('(?:[^']|'')*')|("(?:[^"]|"")*"|`[^`]*`)|(-?\d+(?:\.\d+)?)|([A-Za-z_][\w.]*)|(<>|!=|<=|>=|=|<|>|\(|\)|,|\*|\+|-|;)/y
  let m
  let pos = 0
  while (pos < sql.length) {
    re.lastIndex = pos
    m = re.exec(sql)
    if (!m) throw new SqlError(`Unexpected character "${sql[pos]}" at position ${pos + 1}.`)
    pos = re.lastIndex
    if (m[1] !== undefined) tokens.push({ type: 'str', value: m[1].slice(1, -1).replace(/''/g, "'") })
    else if (m[2] !== undefined) tokens.push({ type: 'id', value: m[2].slice(1, -1) })
    else if (m[3] !== undefined) tokens.push({ type: 'num', value: Number(m[3]) })
    else if (m[4] !== undefined) {
      const up = m[4].toUpperCase()
      tokens.push(KEYWORDS.has(up) ? { type: 'kw', value: up } : { type: 'id', value: m[4] })
    } else if (m[5] !== undefined && m[5] !== ';') tokens.push({ type: 'op', value: m[5] })
  }
  return tokens
}

class Parser {
  constructor(tokens) {
    this.t = tokens
    this.i = 0
  }
  peek(o = 0) {
    return this.t[this.i + o]
  }
  is(type, value) {
    const tok = this.peek()
    return tok && tok.type === type && (value === undefined || tok.value === value)
  }
  kw(...words) {
    if (words.every((w, o) => this.peek(o)?.type === 'kw' && this.peek(o).value === w)) {
      this.i += words.length
      return true
    }
    return false
  }
  op(value) {
    if (this.is('op', value)) {
      this.i++
      return true
    }
    return false
  }
  expect(type, value, what) {
    const tok = this.peek()
    if (!tok || tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new SqlError(`Expected ${what ?? value ?? type}${tok ? ` but found "${tok.value}"` : ' but the query ended'}.`)
    }
    this.i++
    return tok
  }
  ident(what = 'a column name') {
    return this.expect('id', undefined, what).value
  }
  literal() {
    const tok = this.peek()
    if (!tok) throw new SqlError('Expected a value but the query ended.')
    if (tok.type === 'str' || tok.type === 'num') {
      this.i++
      return tok.value
    }
    if (tok.type === 'op' && tok.value === '-' && this.peek(1)?.type === 'num') {
      this.i += 2
      return -this.peek(-1).value
    }
    if (this.kw('NULL')) return null
    if (this.kw('TRUE')) return true
    if (this.kw('FALSE')) return false
    throw new SqlError(`Expected a value but found "${tok.value}".`)
  }

  // WHERE expressions → MongoDB filter objects.
  orExpr() {
    const parts = [this.andExpr()]
    while (this.kw('OR')) parts.push(this.andExpr())
    return parts.length === 1 ? parts[0] : { $or: parts }
  }
  andExpr() {
    const parts = [this.notExpr()]
    while (this.kw('AND')) parts.push(this.notExpr())
    if (parts.length === 1) return parts[0]
    // Merge into one object when no field repeats; otherwise $and keeps every condition.
    const keys = parts.flatMap(Object.keys)
    if (new Set(keys).size === keys.length && !keys.some((k) => k.startsWith('$'))) return Object.assign({}, ...parts)
    return { $and: parts }
  }
  notExpr() {
    if (this.kw('NOT')) return { $nor: [this.notExpr()] }
    if (this.op('(')) {
      if (this.is('kw', 'SELECT')) throw new SqlError('Subqueries are not supported — run them as a separate query or use $lookup.')
      const e = this.orExpr()
      this.expect('op', ')')
      return e
    }
    return this.comparison()
  }
  comparison() {
    const field = this.is('id') && AGGS[this.peek().value.toUpperCase()] && this.peek(1)?.value === '(' ? this.havingAlias() : this.ident()
    if (this.kw('IS', 'NOT', 'NULL')) return { [field]: { $ne: null } }
    if (this.kw('IS', 'NULL')) return { [field]: null }
    const negate = this.kw('NOT')
    if (this.kw('IN')) {
      this.expect('op', '(')
      if (this.is('kw', 'SELECT')) throw new SqlError('Subqueries are not supported — run them as a separate query or use $lookup.')
      const values = [this.literal()]
      while (this.op(',')) values.push(this.literal())
      this.expect('op', ')')
      return { [field]: { [negate ? '$nin' : '$in']: values } }
    }
    if (this.kw('BETWEEN')) {
      const lo = this.literal()
      this.expect('kw', 'AND')
      const hi = this.literal()
      return negate ? { $or: [{ [field]: { $lt: lo } }, { [field]: { $gt: hi } }] } : { [field]: { $gte: lo, $lte: hi } }
    }
    const ilike = this.is('kw', 'ILIKE')
    if (this.kw('LIKE') || this.kw('ILIKE')) {
      const pattern = this.literal()
      if (typeof pattern !== 'string') throw new SqlError('LIKE needs a quoted pattern.')
      const regex = likeToRegex(pattern, ilike)
      return { [field]: negate ? { $not: regex } : regex }
    }
    if (negate) throw new SqlError('NOT must be followed by IN, BETWEEN or LIKE here.')
    const tok = this.expect('op', undefined, 'a comparison like = or >')
    const ops = { '=': null, '!=': '$ne', '<>': '$ne', '<': '$lt', '<=': '$lte', '>': '$gt', '>=': '$gte' }
    if (!(tok.value in ops)) throw new SqlError(`Unexpected "${tok.value}" after ${field}.`)
    if (this.is('id')) throw new SqlError(`Comparing two columns (${field} ${tok.value} ${this.peek().value}) needs $expr — not supported here.`)
    const value = this.literal()
    return { [field]: ops[tok.value] ? { [ops[tok.value]]: value } : value }
  }

  // COUNT(*) / SUM(x) in HAVING, matched to the same aggregate in the SELECT list.
  havingAlias() {
    const fn = this.ident().toUpperCase()
    this.expect('op', '(')
    const arg = this.op('*') ? '*' : this.ident()
    this.expect('op', ')')
    const col = (this.aggregates ?? []).find((c) => c.agg === fn && c.arg === arg)
    if (!col) throw new SqlError(`Add ${fn}(${arg}) to the SELECT list to filter on it in HAVING.`)
    return col.alias
  }
}

// A /regex/ marker object for LIKE patterns: % → .*, _ → ., anchored where the pattern is.
export function likeToRegex(pattern, insensitive = false) {
  let body = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')
  body = (body.startsWith('.*') ? body.slice(2) : '^' + body)
  body = body.endsWith('.*') ? body.slice(0, -2) : body + '$'
  return { $regex: body, ...(insensitive ? { $options: 'i' } : {}) }
}

const AGGS = { COUNT: '$sum', SUM: '$sum', AVG: '$avg', MIN: '$min', MAX: '$max' }

function parseSelectList(p) {
  const cols = []
  if (p.op('*')) return cols
  do {
    const tok = p.peek()
    if (tok?.type === 'id' && AGGS[tok.value.toUpperCase()] && p.peek(1)?.value === '(') {
      const fn = tok.value.toUpperCase()
      p.i += 2
      const distinct = p.kw('DISTINCT')
      const arg = p.op('*') ? '*' : p.ident()
      p.expect('op', ')')
      const alias = p.kw('AS') || p.is('id') ? p.ident('an alias') : `${fn.toLowerCase()}${arg === '*' ? '' : '_' + arg}`
      cols.push({ agg: fn, arg, alias, distinct })
    } else {
      const name = p.ident()
      const alias = p.kw('AS') || p.is('id') ? p.ident('an alias') : null
      cols.push({ name, alias })
    }
  } while (p.op(','))
  return cols
}

function parseSelect(p) {
  const distinct = p.kw('DISTINCT')
  const cols = parseSelectList(p)
  p.expect('kw', 'FROM', 'FROM')
  const table = p.ident('a table name')
  if (['JOIN', 'INNER', 'LEFT', 'RIGHT'].some((k) => p.is('kw', k)) || p.op(','))
    throw new SqlError('Joins are not supported — in MongoDB use $lookup in an aggregation, or embed the related documents.')
  if (p.is('id')) p.i++ // table alias
  const q = { kind: 'select', table, cols, distinct, filter: {}, sort: null, limit: null, skip: null, group: null, having: null }
  if (p.kw('WHERE')) q.filter = p.orExpr()
  if (p.kw('GROUP', 'BY')) {
    q.group = [p.ident()]
    while (p.op(',')) q.group.push(p.ident())
    if (p.kw('HAVING')) {
      p.aggregates = cols.filter((c) => c.agg)
      q.having = p.orExpr()
    }
  }
  if (p.kw('ORDER', 'BY')) {
    q.sort = {}
    do {
      const f = p.ident()
      q.sort[f] = p.kw('DESC') ? -1 : (p.kw('ASC'), 1)
    } while (p.op(','))
  }
  if (p.kw('LIMIT')) {
    q.limit = p.expect('num', undefined, 'a number').value
    if (p.op(',')) {
      q.skip = q.limit
      q.limit = p.expect('num', undefined, 'a number').value
    }
  }
  if (p.kw('OFFSET')) q.skip = p.expect('num', undefined, 'a number').value
  return q
}

export function parseSql(sql) {
  const p = new Parser(tokenize(sql))
  if (!p.peek()) throw new SqlError('Type a SQL query to convert.')
  let q
  if (p.kw('SELECT')) q = parseSelect(p)
  else if (p.kw('INSERT', 'INTO')) {
    const table = p.ident('a table name')
    let cols = null
    if (p.op('(')) {
      cols = [p.ident()]
      while (p.op(',')) cols.push(p.ident())
      p.expect('op', ')')
    }
    p.expect('kw', 'VALUES', 'VALUES')
    const rows = []
    do {
      p.expect('op', '(')
      const row = [p.literal()]
      while (p.op(',')) row.push(p.literal())
      p.expect('op', ')')
      if (!cols) throw new SqlError('List the column names: INSERT INTO table (a, b) VALUES (…).')
      if (row.length !== cols.length) throw new SqlError(`A row has ${row.length} values for ${cols.length} columns.`)
      rows.push(Object.fromEntries(cols.map((c, i) => [c, row[i]])))
    } while (p.op(','))
    q = { kind: 'insert', table, rows }
  } else if (p.kw('UPDATE')) {
    const table = p.ident('a table name')
    p.expect('kw', 'SET', 'SET')
    const set = {}
    const inc = {}
    do {
      const f = p.ident()
      p.expect('op', '=')
      // SET n = n + 1 style increments become $inc.
      if (p.is('id', f) && ['+', '-'].includes(p.peek(1)?.value) && p.peek(2)?.type === 'num') {
        inc[f] = p.peek(1).value === '-' ? -p.peek(2).value : p.peek(2).value
        p.i += 3
      } else if (p.is('id', f)) {
        throw new SqlError(`Only "${f} = ${f} + n" style updates are supported for expressions.`)
      } else set[f] = p.literal()
    } while (p.op(','))
    q = { kind: 'update', table, set, inc, filter: p.kw('WHERE') ? p.orExpr() : {} }
  } else if (p.kw('DELETE', 'FROM')) {
    const table = p.ident('a table name')
    q = { kind: 'delete', table, filter: p.kw('WHERE') ? p.orExpr() : {} }
  } else throw new SqlError('Start with SELECT, INSERT INTO, UPDATE or DELETE FROM.')
  if (p.peek()) throw new SqlError(`Unexpected "${p.peek().value}" — that part isn't supported.`)
  return q
}

// mongosh-style source for a value: unquoted keys when safe, /regex/ literals.
export function toShell(value, indent = 0) {
  const pad = '  '.repeat(indent + 1)
  const end = '  '.repeat(indent)
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    const items = value.map((v) => toShell(v, indent + 1))
    const flat = `[${items.join(', ')}]`
    return flat.length <= 60 && !flat.includes('\n') ? flat : `[\n${items.map((s) => pad + s).join(',\n')}\n${end}]`
  }
  if (typeof value === 'object') {
    if (value.$regex !== undefined && Object.keys(value).every((k) => k === '$regex' || k === '$options'))
      return `/${value.$regex.replace(/\//g, '\\/')}/${value.$options ?? ''}`
    const entries = Object.entries(value).map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${toShell(v, indent + 1)}`)
    if (!entries.length) return '{}'
    const flat = `{ ${entries.join(', ')} }`
    return flat.length <= 60 && !flat.includes('\n') ? flat : `{\n${entries.map((s) => pad + s).join(',\n')}\n${end}}`
  }
  return JSON.stringify(value)
}

function aggregatePipeline(q) {
  const stages = []
  if (Object.keys(q.filter).length) stages.push({ $match: q.filter })
  const aggs = q.cols.filter((c) => c.agg)
  const groupId = q.group ? (q.group.length === 1 ? `$${q.group[0]}` : Object.fromEntries(q.group.map((g) => [g, `$${g}`]))) : null
  const group = { _id: groupId }
  for (const a of aggs) {
    if (a.agg === 'COUNT') group[a.alias] = a.arg === '*' ? { $sum: 1 } : a.distinct ? { $addToSet: `$${a.arg}` } : { $sum: { $cond: [{ $ne: [`$${a.arg}`, null] }, 1, 0] } }
    else group[a.alias] = { [AGGS[a.agg]]: `$${a.arg}` }
  }
  stages.push({ $group: group })
  if (q.having) {
    // HAVING refers to aggregate aliases (or an aggregate written out, e.g. COUNT(*) > 1).
    stages.push({ $match: q.having })
  }
  const project = { _id: 0 }
  for (const c of q.cols) {
    if (c.agg) project[c.alias] = c.agg === 'COUNT' && c.distinct ? { $size: `$${c.alias}` } : 1
    else if (q.group?.includes(c.name)) project[c.alias ?? c.name] = q.group.length === 1 ? '$_id' : `$_id.${c.name}`
  }
  stages.push({ $project: project })
  if (q.sort) stages.push({ $sort: q.sort })
  if (q.skip) stages.push({ $skip: q.skip })
  if (q.limit !== null) stages.push({ $limit: q.limit })
  return stages
}

// The mongosh command for a parsed query, plus notes on how it maps.
export function toMongo(q) {
  const coll = /^[A-Za-z_]\w*$/.test(q.table) ? `db.${q.table}` : `db.getCollection(${JSON.stringify(q.table)})`
  const notes = []
  if (q.kind === 'insert') {
    return q.rows.length === 1
      ? { code: `${coll}.insertOne(${toShell(q.rows[0])})`, notes }
      : { code: `${coll}.insertMany(${toShell(q.rows)})`, notes }
  }
  if (q.kind === 'update') {
    const update = {}
    if (Object.keys(q.set).length) update.$set = q.set
    if (Object.keys(q.inc).length) update.$inc = q.inc
    if (!Object.keys(q.filter).length) notes.push('No WHERE clause: every document is updated.')
    return { code: `${coll}.updateMany(${toShell(q.filter)}, ${toShell(update)})`, notes }
  }
  if (q.kind === 'delete') {
    if (!Object.keys(q.filter).length) notes.push('No WHERE clause: every document is deleted.')
    return { code: `${coll}.deleteMany(${toShell(q.filter)})`, notes }
  }
  const aggs = q.cols.filter((c) => c.agg)
  if (q.group || (aggs.length && !(aggs.length === 1 && aggs[0].agg === 'COUNT' && aggs[0].arg === '*' && q.cols.length === 1))) {
    if (!q.group && q.cols.some((c) => !c.agg)) throw new SqlError('Mixing plain columns with aggregates needs GROUP BY.')
    notes.push('Aggregates and GROUP BY become an aggregation pipeline.')
    return { code: `${coll}.aggregate(${toShell(aggregatePipeline(q))})`, notes }
  }
  if (aggs.length === 1) return { code: `${coll}.countDocuments(${toShell(q.filter)})`, notes }
  if (q.distinct && q.cols.length === 1) {
    const filter = Object.keys(q.filter).length ? `, ${toShell(q.filter)}` : ''
    return { code: `${coll}.distinct(${JSON.stringify(q.cols[0].name)}${filter})`, notes }
  }
  if (q.distinct) notes.push('DISTINCT over several columns needs $group — showing a plain find.')
  const projection = q.cols.length ? { ...Object.fromEntries(q.cols.map((c) => [c.name, 1])), ...(q.cols.some((c) => c.name === '_id') ? {} : { _id: 0 }) } : null
  if (q.cols.some((c) => c.alias)) notes.push('Column aliases need an aggregation $project; find() keeps the original names.')
  let code = `${coll}.find(${toShell(q.filter)}${projection ? `, ${toShell(projection)}` : ''})`
  if (q.sort) code += `.sort(${toShell(q.sort)})`
  if (q.skip) code += `.skip(${q.skip})`
  if (q.limit !== null) code += `.limit(${q.limit})`
  return { code, notes }
}

export function convertSql(sql) {
  try {
    return toMongo(parseSql(sql))
  } catch (e) {
    if (e instanceof SqlError) return { error: e.message }
    throw e
  }
}
