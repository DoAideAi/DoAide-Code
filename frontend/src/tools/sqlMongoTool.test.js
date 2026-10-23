import { describe, expect, it } from 'vitest'
import { convertSql, likeToRegex, toShell } from './sqlMongoTool.js'

const code = (sql) => {
  const r = convertSql(sql)
  if (r.error) throw new Error(r.error)
  return r.code
}

describe('SELECT → find', () => {
  it('converts columns, filters, sort and paging', () => {
    expect(code("SELECT name, email FROM users WHERE age >= 18 AND status = 'active' ORDER BY name ASC, age DESC LIMIT 10 OFFSET 20")).toBe(
      'db.users.find({ age: { $gte: 18 }, status: "active" }, { name: 1, email: 1, _id: 0 }).sort({ name: 1, age: -1 }).skip(20).limit(10)',
    )
    expect(code('SELECT * FROM users')).toBe('db.users.find({})')
  })

  it('handles OR, IN, BETWEEN, LIKE, NULL and NOT', () => {
    expect(code("SELECT * FROM t WHERE a = 1 OR b <> 'x'")).toBe('db.t.find({ $or: [{ a: 1 }, { b: { $ne: "x" } }] })')
    expect(code('SELECT * FROM t WHERE id IN (1, 2) AND x NOT IN (3)')).toBe('db.t.find({ id: { $in: [1, 2] }, x: { $nin: [3] } })')
    expect(code('SELECT * FROM t WHERE p BETWEEN 10 AND 20')).toBe('db.t.find({ p: { $gte: 10, $lte: 20 } })')
    expect(code("SELECT * FROM t WHERE name LIKE 'Jo%' AND email ILIKE '%@gmail.com'")).toBe('db.t.find({ name: /^Jo/, email: /@gmail\\.com$/i })')
    expect(code('SELECT * FROM t WHERE deleted_at IS NULL AND x IS NOT NULL')).toBe('db.t.find({ deleted_at: null, x: { $ne: null } })')
    expect(code('SELECT * FROM t WHERE a > 1 AND a < 5')).toBe('db.t.find({ $and: [{ a: { $gt: 1 } }, { a: { $lt: 5 } }] })')
    expect(code('SELECT * FROM t WHERE NOT (a = 1)')).toBe('db.t.find({ $nor: [{ a: 1 }] })')
    expect(code('SELECT * FROM t WHERE t = -5')).toBe('db.t.find({ t: -5 })')
  })

  it('uses countDocuments and distinct', () => {
    expect(code("SELECT COUNT(*) FROM orders WHERE status = 'paid'")).toBe('db.orders.countDocuments({ status: "paid" })')
    expect(code('SELECT DISTINCT country FROM users')).toBe('db.users.distinct("country")')
  })
})

describe('aggregates', () => {
  it('builds a GROUP BY pipeline with HAVING', () => {
    const out = code('SELECT country, COUNT(*) AS n, AVG(age) FROM users WHERE active = true GROUP BY country HAVING COUNT(*) > 5 ORDER BY n DESC LIMIT 3')
    expect(out).toContain('{ $match: { active: true } }')
    expect(out).toContain('$group: {\n      _id: "$country",\n      n: { $sum: 1 },\n      avg_age: { $avg: "$age" }\n    }')
    expect(out).toContain('{ $match: { n: { $gt: 5 } } }')
    expect(out).toContain('$project: { _id: 0, country: "$_id", n: 1, avg_age: 1 }')
    expect(out).toContain('{ $sort: { n: -1 } }')
    expect(out).toContain('{ $limit: 3 }')
  })
})

describe('writes', () => {
  it('converts INSERT, UPDATE and DELETE', () => {
    expect(code("INSERT INTO users (name, age) VALUES ('Asha', 30)")).toBe('db.users.insertOne({ name: "Asha", age: 30 })')
    expect(code("INSERT INTO users (name) VALUES ('A'), ('B')")).toBe('db.users.insertMany([{ name: "A" }, { name: "B" }])')
    expect(code("UPDATE users SET status = 'gold', visits = visits + 1 WHERE id = 7")).toBe('db.users.updateMany({ id: 7 }, { $set: { status: "gold" }, $inc: { visits: 1 } })')
    expect(code('DELETE FROM sessions WHERE expires < 1700000000')).toBe('db.sessions.deleteMany({ expires: { $lt: 1700000000 } })')
    expect(convertSql('DELETE FROM sessions').notes[0]).toContain('every document')
  })
})

describe('errors', () => {
  it('explains unsupported SQL', () => {
    expect(convertSql('SELECT * FROM a JOIN b ON a.id = b.a_id').error).toContain('$lookup')
    expect(convertSql('SELECT * FROM a WHERE id IN (SELECT x FROM b)').error).toContain('Subqueries')
    expect(convertSql('DROP TABLE x').error).toContain('Start with')
    expect(convertSql('SELECT * FROM').error).toContain('table name')
    expect(convertSql('').error).toContain('Type a SQL')
  })
})

describe('helpers', () => {
  it('converts LIKE patterns and prints shell syntax', () => {
    expect(likeToRegex('a_c')).toEqual({ $regex: '^a.c$' })
    expect(toShell({ 'odd key': [1, null, true] })).toBe('{ "odd key": [1, null, true] }')
  })
})
