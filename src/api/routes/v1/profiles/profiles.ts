import express from "express"
import { adminAuthorized, userAuthorized } from "../../../middleware/auth.js"
import { User } from "../api-models.js"
import { database } from "../../../../clients/database/knex-db.js"
import { cdn, external_resource_regex } from "../../../../clients/cdn/cdn.js"
import { AvailabilityBody } from "../../../../clients/database/db-models.js"
import { getUserRating } from "../util/formatting.js"
import { createNotificationWebhook } from "../util/webhooks.js"
import { rate_limit } from "../../../middleware/ratelimiting.js"
import { fetchChannel, fetchGuild } from "../util/discord.js"
import { authorizeProfile, get_sentinel } from "./helpers.js"
import {
  serializeDetailedProfile,
  serializePublicProfile,
} from "./serializers.js"
import { createErrorResponse, createResponse } from "../util/response.js"
import { oapi, Response400, Response401, Response500 } from "../openapi.js"
import { SUPPORTED_LOCALES } from "../util/i18n.js"
import logger from "../../../../logger/logger.js"

export const profileRouter = express.Router()

// Define OpenAPI schema for profile update
oapi.schema("ProfileUpdateBody", {
  properties: {
    locale: {
      title: "ProfileUpdateBody.locale",
      type: "string",
      enum: [...SUPPORTED_LOCALES],
      description: "User's preferred locale/language",
    },
  },
  required: ["locale"],
  additionalProperties: false,
  title: "ProfileUpdateBody",
  type: "object",
})

profileRouter.post("/auth/link", userAuthorized, async (req, res, next) => {
  try {
    const user = req.user as User
    const username = req.body.username || ""

    const result = await authorizeProfile(username, user.user_id)
    if (result.success) {
      res.json(createResponse(await serializeDetailedProfile(user)))
    } else {
      res.status(402).json(
        createErrorResponse({
          message: result.error,
          status: req.t("common.error"),
        }),
      )
    }
  } catch (e) {
    console.error(e)
  }
})

profileRouter.get(
  "/auth/ident",
  rate_limit(1),
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User
    res.json({ identifier: get_sentinel(user.user_id) })
  },
)

profileRouter.post(
  "/:username/refetch",
  adminAuthorized,
  async (req, res, next) => {
    // try {
    //     const username = req.params['username']
    //
    //     let user, data
    //     try {
    //         user = await database.getUser({username})
    //         data = await fetchProfile(username)
    //     } catch (e) {
    //         res.status(400).json({error: "Invalid username"})
    return
    //     }
    //
    //     const banner_resource = await database.getImageResource({resource_id: user.banner})
    //     if (banner_resource.filename === 'default_profile_banner.png') {
    //         const old_banner = user.banner
    //
    //         let banner_resource = undefined
    //         if (data.banner) {
    //             banner_resource = await cdn.createExternalResource(
    //                 data.banner,
    //                 user.user_id + "_profile_banner",
    //             )
    //
    //             await database.updateUser({user_id: user.user_id}, {
    //                 banner: banner_resource ? banner_resource.resource_id : undefined,
    //             })
    //
    //             await cdn.removeResource(old_banner)
    //         }
    //     }
    //
    //     await database.updateContractor({contractor_id: contractor.contractor_id}, {size: data.data.members})
    //
    //     res.json({result: req.t("common.success")})
    // } catch (e) {
    //     console.error(e)
    // }
    res.status(400).json({ error: "No access" })
  },
)

profileRouter.get("/search/:query", async (req, res, next) => {
  const query = req.params["query"]

  // if (query.length < 3) {
  //   res.status(400).json({
  //     error: "Query must be at least 3 characters long",
  //   })
  //   return
  // }

  const users = await database.searchUsers(query)

  res.json(await Promise.all(users.map((u) => serializePublicProfile(u))))
})

profileRouter.put(
  "",
  rate_limit(30),
  userAuthorized,
  oapi.validPath({
    summary: "Update user profile",
    deprecated: false,
    description: "Update user profile settings including locale preference",
    operationId: "updateProfile",
    tags: ["Profiles"],
    parameters: [],
    requestBody: {
      content: {
        "application/json": {
          schema: oapi.schema("ProfileUpdateBody"),
        },
      },
    },
    responses: {
      "200": {
        description: "OK - Profile successfully updated",
        content: {
          "application/json": {
            schema: {
              properties: {
                data: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Locale updated successfully",
                    },
                    locale: {
                      type: "string",
                      enum: [...SUPPORTED_LOCALES],
                      example: "en",
                    },
                  },
                  required: ["message", "locale"],
                },
                status: {
                  type: "string",
                  example: "success",
                },
              },
              required: ["data", "status"],
              type: "object",
              title: "UpdateProfileSuccess",
            },
          },
        },
        headers: {},
      },
      "400": Response400,
      "401": Response401,
      "500": Response500,
    },
    security: [],
  }),
  async (req, res) => {
    try {
      const user = req.user as User
      const { locale }: { locale: string } = req.body

      // Update user locale in database
      const updatedUsers = await database.updateUser(
        { user_id: user.user_id },
        { locale },
      )

      if (updatedUsers.length === 0) {
        res.status(500).json(
          createErrorResponse({
            message: req.t("errors.failedToUpdateUserLocale"),
            status: req.t("common.error"),
          }),
        )
        return
      }

      res.json(
        createResponse({
          message: req.t("success.localeUpdated"),
          locale: updatedUsers[0].locale,
        }),
      )
    } catch (error) {
      logger.error("Error updating user locale:", error)
      res.status(500).json(
        createErrorResponse({
          message: req.t("errors.internalServerError"),
          status: req.t("common.error"),
        }),
      )
    }
  },
)

profileRouter.post(
  "/update",
  rate_limit(30),
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User

    const {
      about,
      avatar_url,
      banner_url,
      display_name,
      market_order_template,
    }: {
      about?: string
      avatar_url?: string
      banner_url?: string
      display_name?: string
      market_order_template?: string
    } = req.body

    // Do checks first
    if (avatar_url && !avatar_url.match(external_resource_regex)) {
      res.status(400).json({ error: req.t("errors.invalidUrl") })
      return
    }

    if (banner_url && !banner_url.match(external_resource_regex)) {
      res.status(400).json({ error: req.t("errors.invalidUrl") })
      return
    }

    if (
      display_name &&
      (display_name.length > 30 || display_name.length === 0)
    ) {
      res.status(400).json({ error: req.t("errors.invalidDisplayName") })
      return
    }

    const old_avatar = user.avatar
    const old_banner = user.banner

    // Then insert
    let avatar_resource = undefined
    if (avatar_url) {
      avatar_resource = await cdn.createExternalResource(
        avatar_url,
        user.user_id + "_avatar",
      )
    }

    let banner_resource = undefined
    if (banner_url) {
      banner_resource = await cdn.createExternalResource(
        banner_url,
        user.user_id + "_banner",
      )
    }

    const newUsers = await database.updateUser(
      { user_id: user.user_id },
      {
        profile_description: about || "",
        banner: banner_resource ? banner_resource.resource_id : undefined,
        avatar: avatar_resource ? avatar_resource.resource_id : undefined,
        display_name: display_name || undefined,
        market_order_template: market_order_template,
      },
    )

    if (avatar_url) {
      await cdn.removeResource(old_avatar)
    }

    if (banner_url) {
      await cdn.removeResource(old_banner)
    }

    res.json({ result: req.t("common.success"), ...newUsers[0] })
  },
)

profileRouter.post(
  "/webhook/create",
  rate_limit(15),
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User

    const {
      webhook_url,
      name,
      actions,
    }: {
      webhook_url: string
      name: string
      actions: string[]
    } = req.body

    // TODO: Check for actual URL
    if (!webhook_url || !name) {
      res.status(400).json({ error: req.t("errors.invalidArguments") })
      return
    }

    try {
      await createNotificationWebhook(
        name,
        webhook_url,
        actions,
        undefined,
        user.user_id,
      )
    } catch (e) {
      res.status(400).json({ error: req.t("errors.invalidActions") })
      return
    }
    res.json({ result: req.t("common.success") })
  },
)

profileRouter.post(
  "/webhook/delete",
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User

    const {
      webhook_id,
    }: {
      webhook_id: string
    } = req.body

    // Do checks first
    if (!webhook_id) {
      res.status(400).json({ error: req.t("errors.invalidArguments") })
      return
    }

    const webhook = await database.getNotificationWebhook({ webhook_id })
    if (webhook?.user_id !== user.user_id) {
      res.status(403).json({ error: req.t("errors.unauthorized") })
      return
    }

    await database.deleteNotificationWebhook({
      webhook_id,
      user_id: user.user_id,
    })
    res.json({ result: req.t("common.success") })
  },
)

profileRouter.get("/webhooks", userAuthorized, async (req, res, next) => {
  const user = req.user as User

  const webhooks = await database.getNotificationWebhooks({
    user_id: user.user_id,
  })
  res.json(webhooks)
})

profileRouter.get("/allusers", adminAuthorized, async (req, res, next) => {
  res.json(await database.getMinimalUsersAdmin({}))
})

profileRouter.get("/user/:username/reviews", async (req, res, next) => {
  const username = req.params["username"]
  let user
  try {
    user = await database.getUser({ username: username }, { noBalance: true })
  } catch (e) {
    res.status(400).json({ error: req.t("errors.invalidUser") })
    return
  }

  const reviews = await database.getUserReviews(user.user_id)
  res.json(
    await Promise.all(
      reviews.map(async (review) => {
        return {
          ...review,
          user_author: review.user_author
            ? await database.getMinimalUser({ user_id: review.user_author })
            : null,
          contractor_author: review.contractor_author
            ? await database.getMinimalContractor({
                contractor_id: review.contractor_author,
              })
            : null,
        }
      }),
    ),
  )
})

profileRouter.get("/user/:username", async (req, res, next) => {
  try {
    const requester = req.user as User
    const username = req.params["username"]
    let user
    try {
      user = await database.getUser({ username: username }, { noBalance: true })
    } catch (e) {
      res.status(400).json({ error: req.t("errors.invalidUser") })
      return
    }

    res.json(await serializePublicProfile(user, { discord: !!requester }))
  } catch (e) {
    console.error(e)
    res.status(400).json({ error: req.t("errors.invalidUser") })
    return
  }
})

export interface AccountSettingsBody {
  discord_order_share?: boolean
  discord_public?: boolean
}

profileRouter.post(
  "/settings/update",
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User

    const { discord_order_share, discord_public } = req.body

    if (discord_order_share === undefined && discord_public === undefined) {
      res.status(400).json({ error: req.t("errors.invalidBody") })
      return
    }

    await database.updateUserSettings(user.user_id, {
      discord_order_share,
      discord_public,
    })

    res.json({ result: req.t("common.success") })
    return
  },
)

profileRouter.post(
  "/availability/update",
  userAuthorized,
  async (req, res, next) => {
    try {
      const user = req.user as User

      const { contractor, selections } = req.body as AvailabilityBody

      if (contractor != null) {
        let cobj
        try {
          cobj = await database.getContractor({ spectrum_id: contractor })
        } catch {
          res.status(403).json({ error: req.t("errors.invalidContractor") })
          return
        }

        if (
          !(await database.getMemberRoles(cobj.contractor_id, user.user_id))
            .length
        ) {
          res.status(403).json({ error: req.t("errors.invalidContractor") })
          return
        }

        await database.updateUserAvailability(
          user.user_id,
          cobj.contractor_id,
          selections,
        )
      } else {
        await database.updateUserAvailability(user.user_id, null, selections)
      }

      res.json({ result: req.t("common.success") })
      return
    } catch (e) {
      console.error(e)
    }
  },
)

profileRouter.get(
  "/availability/contractor/:spectrum_id",
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User
    const spectrum_id = req.params["spectrum_id"]

    let cobj
    try {
      cobj = await database.getContractor({ spectrum_id })
    } catch {
      res.status(403).json({ error: req.t("errors.invalidContractor") })
      return
    }

    res.json({
      contractor: spectrum_id,
      selections: await database.getUserAvailability(
        user.user_id,
        cobj.contractor_id,
      ),
    })
    return
  },
)

profileRouter.get(
  "/settings/discord",
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User
    let guild
    let avatar
    if (user.official_server_id) {
      guild = await fetchGuild(user.official_server_id)
      avatar = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=240`
    }

    let channel
    if (user.discord_thread_channel_id) {
      channel = await fetchChannel(user.discord_thread_channel_id)
    }

    res.json({
      guild_avatar: avatar,
      guild_name: guild?.name,
      channel_name: channel?.name,
      official_server_id: user.official_server_id,
      discord_thread_channel_id: user.discord_thread_channel_id,
    })
    return
  },
)
profileRouter.post(
  "/settings/discord/use_official",
  userAuthorized,
  async (req, res, next) => {
    const user = req.user as User
    await database.updateUser(
      { user_id: user.user_id },
      {
        official_server_id: "1003056231591727264",
        discord_thread_channel_id: "1072580369251041330",
      },
    )
    res.json({ result: req.t("common.success") })
    return
  },
)

profileRouter.get("/availability", userAuthorized, async (req, res, next) => {
  const user = req.user as User

  res.json({
    contractor: null,
    selections: await database.getUserAvailability(user.user_id, null),
  })
  return
})

profileRouter.get(
  "",
  rate_limit(1),
  userAuthorized,
  oapi.validPath({
    summary: "Get current user profile",
    deprecated: false,
    description:
      "Retrieve the complete profile information for the authenticated user including contractors, settings, and preferences",
    operationId: "getCurrentUserProfile",
    tags: ["Profiles"],
    parameters: [],
    responses: {
      "200": {
        description: "OK - User profile retrieved successfully",
        content: {
          "application/json": {
            schema: {
              properties: {
                user_id: {
                  type: "string",
                  format: "uuid",
                  example: "123e4567-e89b-12d3-a456-426614174000",
                },
                username: {
                  type: "string",
                  example: "example_user",
                },
                display_name: {
                  type: "string",
                  example: "Example User",
                },
                profile_description: {
                  type: "string",
                  example: "A brief description about the user",
                },
                role: {
                  type: "string",
                  enum: ["user", "admin"],
                  example: "user",
                },
                banned: {
                  type: "boolean",
                  example: false,
                },
                balance: {
                  type: "number",
                  example: 1000,
                },
                created_at: {
                  type: "string",
                  format: "date-time",
                  example: "2023-01-01T00:00:00Z",
                },
                official_server_id: {
                  type: "string",
                  nullable: true,
                  example: "1003056231591727264",
                },
                discord_thread_channel_id: {
                  type: "string",
                  nullable: true,
                  example: "1072580369251041330",
                },
                market_order_template: {
                  type: "string",
                  example: "Default order template",
                },
                locale: {
                  type: "string",
                  enum: [...SUPPORTED_LOCALES],
                  example: "en",
                },
                contractors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      contractor_id: {
                        type: "string",
                        format: "uuid",
                      },
                      spectrum_id: {
                        type: "string",
                      },
                      name: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                      avatar: {
                        type: "string",
                      },
                      banner: {
                        type: "string",
                      },
                      size: {
                        type: "number",
                      },
                      role: {
                        type: "string",
                      },
                    },
                  },
                },
                avatar: {
                  type: "string",
                  format: "uri",
                  example: "https://cdn.example.com/avatar.jpg",
                },
                banner: {
                  type: "string",
                  format: "uri",
                  example: "https://cdn.example.com/banner.jpg",
                },
                settings: {
                  type: "object",
                  properties: {
                    discord_order_share: {
                      type: "boolean",
                      example: true,
                    },
                    discord_public: {
                      type: "boolean",
                      example: false,
                    },
                  },
                },
                rating: {
                  type: "object",
                  properties: {
                    average: {
                      type: "number",
                      example: 4.5,
                    },
                    count: {
                      type: "number",
                      example: 10,
                    },
                  },
                },
                discord_profile: {
                  type: "object",
                  properties: {
                    username: {
                      type: "string",
                      nullable: true,
                      example: "discord_user",
                    },
                    discriminator: {
                      type: "string",
                      nullable: true,
                      example: "1234",
                    },
                    id: {
                      type: "string",
                      nullable: true,
                      example: "123456789012345678",
                    },
                  },
                },
              },
              required: [
                "user_id",
                "username",
                "display_name",
                "profile_description",
                "role",
                "banned",
                "balance",
                "created_at",
                "locale",
                "contractors",
                "avatar",
                "banner",
                "settings",
                "rating",
                "discord_profile",
                "market_order_template",
              ],
              type: "object",
              title: "GetCurrentUserProfileSuccess",
            },
          },
        },
        headers: {},
      },
      "401": Response401,
      "500": Response500,
    },
    security: [],
  }),
  async (req, res, next) => {
    try {
      const { discord_access_token, discord_refresh_token, ...user } =
        req.user as User

      const contractors = await database.getUserContractorRoles({
        user_id: user.user_id,
      })
      const discord_profile = await database.discord_profile_cache.fetch(
        user.user_id,
      )

      res.json({
        ...user,
        balance: +user.balance!,
        contractors: await Promise.all(
          contractors.map(async (s) => ({
            ...(await database.getMinimalContractor({
              spectrum_id: s.spectrum_id,
            })),
            role: s.role,
          })),
        ),
        avatar: await cdn.getFileLinkResource(user.avatar),
        banner: await cdn.getFileLinkResource(user.banner),
        // notifications: await database.getCompleteNotificationsByUser(user.user_id),
        settings: await database.getUserSettings(user.user_id),
        rating: await getUserRating(user.user_id),
        discord_profile: {
          username: discord_profile?.username,
          discriminator: discord_profile?.discriminator,
          id: discord_profile?.id,
        },
        market_order_template: user.market_order_template,
      })
    } catch (e) {
      logger.error("Error fetching user profile:", e)
      res.status(500)
      return
    }
  },
)

export type PaymentTypes =
  | "one-time"
  | "hourly"
  | "daily"
  | "unit"
  | "box"
  | "scu"
  | "cscu"
  | "mscu"

export const paymentTypeMessages = new Map<PaymentTypes, string>()
paymentTypeMessages.set("one-time", "")
paymentTypeMessages.set("hourly", "per hour")
paymentTypeMessages.set("daily", "per day")
paymentTypeMessages.set("unit", "per unit")
paymentTypeMessages.set("box", "per box")
paymentTypeMessages.set("scu", "per SCU")
paymentTypeMessages.set("cscu", "per cSCU")
paymentTypeMessages.set("mscu", "per mSCU")

profileRouter.get(
  "/my_data",
  rate_limit(30),
  userAuthorized,
  async (req, res) => {
    const user = req.user as User
    res.set({ "Content-Disposition": 'attachment; filename="data.txt"' })
    let content = ""
    content += `RSI Handle: ${user.username}\n`
    content += `Discord ID: ${user.discord_id}\n`
    content += `Display Name: ${user.display_name}\n`
    content += `Profile Description: ${user.profile_description}\n`
    content += `Avatar URL: ${await cdn.getFileLinkResource(user.avatar)}\n`
    content += `Banner URL: ${await cdn.getFileLinkResource(user.banner)}\n`
    content += `Linked Discord Server ID: ${user.official_server_id}\n`
    content += `Linked Discord Thread ID: ${user.discord_thread_channel_id}\n\n`
    content += "Contractors:\n"

    content += "Orders:\n"
    const orders = await database.getOrders({
      customer_id: user.user_id,
    })
    orders.push(
      ...(await database.getOrders({
        assigned_id: user.user_id,
      })),
    )

    for (const order of orders) {
      content += `${order.title} - ${order.timestamp}:\n`
      content += `Rush: ${order.rush}\n`
      content += `Departure: ${order.departure}\n`
      content += `Destination: ${order.destination}\n`
      content += `Kind: ${order.kind}\n`
      content += `Cost: ${order.cost}\n`
      content += `Collateral: ${order.collateral}\n`
      content += `Description: ${order.description}\n`
      content += `Status: ${order.status}\n`
      content += `Payment Type: ${order.payment_type}\n`
      content += `Discord Thread: ${order.thread_id}\n`
    }

    const contractors = await database.getUserContractorRoles({
      user_id: user.user_id,
    })
    for (const role_details of contractors) {
      content += `${role_details.spectrum_id}: ${role_details.role}\n`
      if (role_details.role === "owner") {
        const contractor = await database.getContractor({
          spectrum_id: role_details.spectrum_id,
        })
        content += `Spectrum ID: ${contractor.spectrum_id}\n`
        content += `Name: ${contractor.name}\n`
        content += `Name: ${contractor.description}\n`
        content += `Avatar URL: ${await cdn.getFileLinkResource(
          contractor.avatar,
        )}\n`
        content += `Banner URL: ${await cdn.getFileLinkResource(
          contractor.banner,
        )}\n`
        content += `Size: ${contractor.size}\n`
        content += `Linked Discord Server ID: ${contractor.official_server_id}\n`
        content += `Linked Discord Thread ID: ${contractor.discord_thread_channel_id}\n`
        const fields = await database.getContractorFields({
          "contractors.contractor_id": contractor.contractor_id,
        })
        content += `Fields: ${fields.map((f) => f.field).join(", ")}\n`
        content += `Roles:\n\n`

        const roles = await database.getContractorRoles({
          contractor_id: contractor.contractor_id,
        })
        for (const role of roles) {
          content += `${role.name}\n`
          content += `Position ${role.position}\n`
          content += `Manage Roles ${role.manage_roles}\n`
          content += `Manage Orders ${role.manage_orders}\n`
          content += `Kick Members ${role.kick_members}\n`
          content += `Manage Invites ${role.manage_invites}\n`
          content += `Manage Org Details ${role.manage_org_details}\n`
          content += `Manage Stock ${role.manage_stock}\n`
          content += `Manage Market ${role.manage_market}\n`
          content += `Manage Recruiting ${role.manage_recruiting}\n`
          content += `Manage Webhooks ${role.manage_webhooks}\n\n`
        }

        content += "Orders:\n\n"
        const orders = await database.getOrders({
          contractor_id: contractor.contractor_id,
        })

        for (const order of orders) {
          content += `${order.title} - ${order.timestamp}:\n`
          content += `Rush: ${order.rush}\n`
          content += `Departure: ${order.departure}\n`
          content += `Destination: ${order.destination}\n`
          content += `Kind: ${order.kind}\n`
          content += `Cost: ${order.cost}\n`
          content += `Collateral: ${order.collateral}\n`
          content += `Description: ${order.description}\n`
          content += `Status: ${order.status}\n`
          content += `Payment Type: ${order.payment_type}\n`
          content += `Discord Thread: ${order.thread_id}\n\n`
        }

        content += "Reviews:\n\n"
        const reviews = await database.getOrderReviews({
          contractor_author: contractor.contractor_id,
        })
        for (const review of reviews) {
          content += `${review.order_id}: ${review.rating}/5 \`${review.content}\` at ${review.timestamp} as ${review.role}\n`
        }
        content += "\n"
      }
    }

    content += "Messages:\n\n"
    const messages = await database.getMessages({ author: user.user_id })
    for (const message of messages) {
      content += `${message.message_id}: \`${message.content}\` in ${message.chat_id} at ${message.timestamp}\n`
    }
    content += "\n"

    content += "Comments:\n\n"
    const comments = await database.getComments({ author: user.user_id })
    for (const comment of comments) {
      content += `${comment.comment_id}: \`${comment.content}\` at ${comment.timestamp}\n`
    }
    content += "\n"

    content += "Reviews:\n\n"
    const reviews = await database.getOrderReviews({
      user_author: user.user_id,
    })
    for (const review of reviews) {
      content += `${review.order_id}: ${review.rating}/5 \`${review.content}\` at ${review.timestamp} as ${review.role}\n`
    }
    content += "\n"

    res.json(content)
  },
)
