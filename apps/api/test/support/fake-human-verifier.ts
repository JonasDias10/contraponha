import {
  HumanVerifier,
  type VerifyHumanParams,
} from "#src/infrastructure/human-check/human-verifier.js"

export const BOT_TOKEN = "bot"

// Accepts every sign-up except the ones carrying BOT_TOKEN.
export class FakeHumanVerifier extends HumanVerifier {
  verify({ token }: VerifyHumanParams): Promise<boolean> {
    return Promise.resolve(token !== BOT_TOKEN)
  }
}
