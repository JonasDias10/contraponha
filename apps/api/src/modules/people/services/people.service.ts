import { Injectable } from "@nestjs/common"
import { daysToMs } from "@contraponha/config"
import type {
  FollowedByPreview,
  ProfileView,
  ProfileViewerState,
  Recognition,
  SuggestedPeople,
} from "@contraponha/types"

import {
  FOLLOWED_BY_PREVIEW_LIMIT,
  RECOGNITION_TOPICS_MAX,
  SUGGESTIONS_LIMIT,
  toRecognition,
  WRITES_ABOUT_LIMIT,
} from "#src/modules/people/domain/recognition.js"
import { PeopleRepository } from "#src/modules/people/repositories/people.repository.js"
import { toTopicSummary } from "#src/modules/topics/domain/topic.js"
import { toPublicProfile } from "#src/modules/users/domain/user.js"
import { UserRelationsService } from "#src/modules/users/services/user-relations.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const SUGGESTION_WINDOW_DAYS = 90

export interface ProfileRequest {
  handle: string
  viewerId: string | undefined
}

interface ViewerStateParams {
  viewerId: string
  userId: string
}

export interface FollowedByRequest {
  handle: string
  viewerId: string
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly peopleRepository: PeopleRepository,
    private readonly usersService: UsersService,
    private readonly relations: UserRelationsService,
  ) {}

  async profile({ handle, viewerId }: ProfileRequest): Promise<ProfileView> {
    const user = await this.usersService.getByHandle(handle)
    const recognition = await this.recognitionOf(user.id)

    const writesAbout = await this.peopleRepository.writesAbout({
      userId: user.id,
      limit: WRITES_ABOUT_LIMIT,
    })

    const viewer =
      viewerId && viewerId !== user.id
        ? await this.viewerState({ viewerId, userId: user.id })
        : null

    return {
      ...toPublicProfile(user),
      recognition,
      topics: writesAbout.map(toTopicSummary),
      viewer,
    }
  }

  async followedBy({ handle, viewerId }: FollowedByRequest): Promise<FollowedByPreview> {
    const user = await this.usersService.getByHandle(handle)

    const { people, total } = await this.peopleRepository.followedBy({
      viewerId,
      userId: user.id,
      limit: FOLLOWED_BY_PREVIEW_LIMIT,
    })

    return { people: people.map(toPublicProfile), total }
  }

  async suggestions(viewerId: string): Promise<SuggestedPeople> {
    const suggested = await this.peopleRepository.suggest({
      viewerId,
      since: new Date(Date.now() - daysToMs(SUGGESTION_WINDOW_DAYS)),
      limit: SUGGESTIONS_LIMIT,
    })

    const people = []

    for (const user of suggested) {
      const recognition = await this.recognitionOf(user.id)

      people.push({ profile: toPublicProfile(user), recognition })
    }

    return { people }
  }

  private async recognitionOf(userId: string): Promise<Recognition | null> {
    const received = await this.peopleRepository.receivedReactions(userId)

    const recognized = await this.peopleRepository.recognizedTopics({
      userId,
      limit: RECOGNITION_TOPICS_MAX,
    })

    return toRecognition({ received, topics: recognized.map(toTopicSummary) })
  }

  private async viewerState({ viewerId, userId }: ViewerStateParams): Promise<ProfileViewerState> {
    const [follow, relation] = await Promise.all([
      this.peopleRepository.followState({ viewerId, userId }),
      this.relations.flags({ actorId: viewerId, targetId: userId }),
    ])

    return { ...follow, ...relation }
  }
}
