import ipaddr from "ipaddr.js"

// Only addresses on the public internet: no loopback, private, link-local (cloud metadata
// at 169.254.169.254), carrier-grade NAT, multicast or reserved ranges.
export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false

  const parsed = ipaddr.process(address)

  return parsed.range() === "unicast"
}
