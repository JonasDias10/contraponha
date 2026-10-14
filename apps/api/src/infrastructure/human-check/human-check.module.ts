import { Global, Module } from "@nestjs/common"

import { HumanVerifier } from "./human-verifier.js"
import { TurnstileVerifier } from "./turnstile-verifier.js"

@Global()
@Module({
  providers: [{ provide: HumanVerifier, useClass: TurnstileVerifier }],
  exports: [HumanVerifier],
})
export class HumanCheckModule {}
