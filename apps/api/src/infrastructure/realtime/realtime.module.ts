import { Global, Module } from "@nestjs/common"

import { RealtimeBus } from "./realtime-bus.js"

@Global()
@Module({
  providers: [RealtimeBus],
  exports: [RealtimeBus],
})
export class RealtimeInfrastructureModule {}
