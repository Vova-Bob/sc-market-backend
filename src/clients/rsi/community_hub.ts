import { GraphQLClient, gql } from "graphql-request"

export interface CommunityHubResponse {
  creator: {
    bio: string
    citizenDossierUrl: string
    displayName: string
    live: null
    nickname: string
    thumbnailUrl: string
    website: string
    __typename: string
  }
}

export const community_hub = new GraphQLClient(
  `https://robertsspaceindustries.com/community-hub/api/v1/graphql`,
  {},
)

const document = gql`
  query getAccount($CreatorQuery: CreatorQuery!) {
    creator(query: $CreatorQuery) {
      ...Account
      __typename
    }
  }

  fragment Account on Account {
    bio
    citizenDossierUrl
    displayName
    live
    nickname
    stats {
      ...AccountStats
      __typename
    }
    thumbnailUrl
    website
    __typename
  }

  fragment AccountStats on AccountStats {
    followed
    followedCount
    followingCount
    upvotesCount
    viewsCount
    __typename
  }
`

export async function fetchRSIProfileCommunityHub(
  spectrum_id: string,
): Promise<CommunityHubResponse> {
  const result = await community_hub.request<CommunityHubResponse>({
    document,
    variables: { CreatorQuery: { nickname: spectrum_id } },
  })

  return result
}
