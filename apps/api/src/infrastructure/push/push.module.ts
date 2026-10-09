import { Global, Module } from "@nestjs/common"

import { ExpoPushSender } from "./expo-push-sender.js"
import { PushSender } from "./push-sender.js"

@Global()
@Module({
  providers: [{ provide: PushSender, useClass: ExpoPushSender }],
  exports: [PushSender],
})
export class PushModule {}
