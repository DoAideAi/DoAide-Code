import { describe, expect, it } from 'vitest'
import { contains, ipToInt, maskToPrefix, parseCidr, splitSubnets, subnetInfo } from './ipTool.js'

describe('parseCidr', () => {
  it('reads CIDR, netmask and bare forms', () => {
    expect(parseCidr('192.168.1.10/24')).toEqual({ ip: ipToInt('192.168.1.10'), prefix: 24 })
    expect(parseCidr('10.1.2.3 255.255.0.0').prefix).toBe(16)
    expect(parseCidr('8.8.8.8').prefix).toBe(32)
  })

  it('explains bad input', () => {
    expect(parseCidr('256.1.1.1/24').error).toContain('not a valid IPv4')
    expect(parseCidr('10.0.0.1/33').error).toContain('/32')
    expect(parseCidr('10.0.0.1 255.0.255.0').error).toContain('contiguous')
    expect(parseCidr('hello').error).toBeTruthy()
  })
})

describe('subnetInfo', () => {
  it('computes a /24', () => {
    const s = subnetInfo(ipToInt('192.168.1.130'), 24)
    expect(s).toMatchObject({
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      netmask: '255.255.255.0',
      wildcard: '0.0.0.255',
      firstHost: '192.168.1.1',
      lastHost: '192.168.1.254',
      usable: 254,
      total: 256,
      type: 'Private (RFC 1918)',
      addressClass: 'C',
    })
    expect(s.binaryMask).toBe('11111111.11111111.11111111.00000000')
  })

  it('handles /31, /32 and /0', () => {
    expect(subnetInfo(ipToInt('10.0.0.0'), 31).usable).toBe(2)
    expect(subnetInfo(ipToInt('1.2.3.4'), 32)).toMatchObject({ usable: 1, firstHost: '1.2.3.4', type: 'Public' })
    expect(subnetInfo(ipToInt('1.2.3.4'), 0)).toMatchObject({ network: '0.0.0.0', broadcast: '255.255.255.255', netmask: '0.0.0.0' })
  })

  it('labels special ranges', () => {
    expect(subnetInfo(ipToInt('172.20.0.1'), 32).type).toBe('Private (RFC 1918)')
    expect(subnetInfo(ipToInt('172.32.0.1'), 32).type).toBe('Public')
    expect(subnetInfo(ipToInt('127.0.0.1'), 8).type).toBe('Loopback')
    expect(subnetInfo(ipToInt('100.100.1.1'), 32).type).toContain('NAT')
  })
})

describe('splitting and membership', () => {
  it('splits a /24 into four /26s', () => {
    const { rows, total } = splitSubnets(ipToInt('192.168.1.0'), 24, 26)
    expect(total).toBe(4)
    expect(rows.map((r) => r.cidr)).toEqual(['192.168.1.0/26', '192.168.1.64/26', '192.168.1.128/26', '192.168.1.192/26'])
    expect(rows[1].range).toBe('192.168.1.65 – 192.168.1.126')
  })

  it('caps very large splits', () => {
    const { rows, total } = splitSubnets(ipToInt('10.0.0.0'), 8, 24)
    expect(total).toBe(65536)
    expect(rows).toHaveLength(256)
  })

  it('checks membership', () => {
    expect(contains(ipToInt('10.0.0.0'), 8, ipToInt('10.255.1.1'))).toBe(true)
    expect(contains(ipToInt('10.0.0.0'), 8, ipToInt('11.0.0.1'))).toBe(false)
    expect(maskToPrefix('255.255.255.252')).toBe(30)
  })
})
