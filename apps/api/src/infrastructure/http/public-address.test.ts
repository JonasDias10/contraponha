import { describe, expect, it } from "vitest"

import { isPublicAddress } from "./public-address.js"

describe("isPublicAddress", () => {
  it("accepts public IPv4 and IPv6", () => {
    expect(isPublicAddress("93.184.216.34")).toBe(true)

    expect(isPublicAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(true)
  })

  it("refuses loopback, private, link-local, CGNAT and mapped private addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.3.4",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "not an ip",
    ])
      expect(isPublicAddress(address), address).toBe(false)
  })
})
