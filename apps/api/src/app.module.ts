import { Module, type DynamicModule } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { SentryModule } from "@sentry/nestjs/setup"
import { LoggerModule } from "nestjs-pino"

import { AllExceptionsFilter } from "#src/common/errors/all-exceptions.filter.js"
import { buildLoggerParams } from "#src/common/logging/logger.options.js"
import { buildThrottlers } from "#src/common/rate-limit/rate-limit.js"
import type { AppConfig } from "#src/config/app-config.js"
import { ConfigModule } from "#src/config/config.module.js"
import { DatabaseModule } from "#src/infrastructure/database/database.module.js"
import { EmailModule } from "#src/infrastructure/email/email.module.js"
import { PushModule as PushInfrastructureModule } from "#src/infrastructure/push/push.module.js"
import { RealtimeInfrastructureModule } from "#src/infrastructure/realtime/realtime.module.js"
import { RedisModule } from "#src/infrastructure/redis/redis.module.js"
import { StorageModule } from "#src/infrastructure/storage/storage.module.js"
import { AccountsModule } from "#src/modules/accounts/accounts.module.js"
import { AdminModule } from "#src/modules/admin/admin.module.js"
import { AuthModule } from "#src/modules/auth/auth.module.js"
import { BookmarksModule } from "#src/modules/bookmarks/bookmarks.module.js"
import { CommentsModule } from "#src/modules/comments/comments.module.js"
import { FollowsModule } from "#src/modules/follows/follows.module.js"
import { FeedModule } from "#src/modules/feed/feed.module.js"
import { MediaModule } from "#src/modules/media/media.module.js"
import { ModerationModule } from "#src/modules/moderation/moderation.module.js"
import { NotificationsModule } from "#src/modules/notifications/notifications.module.js"
import { SessionAuthGuard } from "#src/modules/auth/guards/session-auth.guard.js"
import { HealthModule } from "#src/modules/health/health.module.js"
import { PeopleModule } from "#src/modules/people/people.module.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { PushModule } from "#src/modules/push/push.module.js"
import { ReactionsModule } from "#src/modules/reactions/reactions.module.js"
import { RealtimeModule } from "#src/modules/realtime/realtime.module.js"
import { RelationsModule } from "#src/modules/relations/relations.module.js"
import { SearchModule } from "#src/modules/search/search.module.js"
import { TopicsModule } from "#src/modules/topics/topics.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        SentryModule.forRoot(),
        ConfigModule.forRoot(config),
        LoggerModule.forRoot(buildLoggerParams(config)),
        ThrottlerModule.forRoot(buildThrottlers(config)),
        DatabaseModule,
        RedisModule,
        RealtimeInfrastructureModule,
        EmailModule,
        PushInfrastructureModule,
        StorageModule,
        HealthModule,
        UsersModule,
        AuthModule,
        TopicsModule,
        PostsModule,
        CommentsModule,
        ReactionsModule,
        FollowsModule,
        RelationsModule,
        RealtimeModule,
        MediaModule,
        NotificationsModule,
        PushModule,
        FeedModule,
        SearchModule,
        ModerationModule,
        AdminModule,
        BookmarksModule,
        PeopleModule,
        AccountsModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useExisting: SessionAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }
  }
}
