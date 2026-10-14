export interface VerifyHumanParams {
  token: string | undefined
  remoteIp: string | undefined
}

// Proves a sign-up comes from a person. The Turnstile implementation is used when a secret
// is configured; otherwise every request passes (local development and tests).
export abstract class HumanVerifier {
  abstract verify(params: VerifyHumanParams): Promise<boolean>
}
