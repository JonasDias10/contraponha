import { Injectable } from "@nestjs/common"
import { hash, verify } from "@node-rs/argon2"

export interface VerifyPasswordParams {
  passwordHash: string
  password: string
}

@Injectable()
export class PasswordHasher {
  private readonly decoyHash = hash("decoy password used to equalize login timing")

  hash(password: string): Promise<string> {
    return hash(password)
  }

  verify({ passwordHash, password }: VerifyPasswordParams): Promise<boolean> {
    return verify(passwordHash, password)
  }

  // Runs a full verification when the account does not exist, so response time does not reveal it.
  async verifyAgainstDecoy(password: string): Promise<false> {
    const decoyHash = await this.decoyHash

    await verify(decoyHash, password)

    return false
  }
}
