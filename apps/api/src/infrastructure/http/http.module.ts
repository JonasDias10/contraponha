import { Global, Module } from "@nestjs/common"

import { RemoteFetcher, SafeRemoteFetcher } from "./remote-fetcher.js"

@Global()
@Module({
  providers: [{ provide: RemoteFetcher, useClass: SafeRemoteFetcher }],
  exports: [RemoteFetcher],
})
export class HttpInfrastructureModule {}
