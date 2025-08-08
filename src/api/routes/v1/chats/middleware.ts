import express from "express"
import { database } from "../../../../clients/database/knex-db.js"
import { createErrorResponse } from "../util/response.js"
import { is_related_to_order } from "../orders/helpers.js"
import { is_related_to_offer } from "../offers/helpers.js"
import { User } from "../api-models.js"
import {
  DBChat,
  DBOffer,
  DBOfferSession,
  DBOrder,
} from "../../../../clients/database/db-models.js"

export async function valid_chat(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  let chat
  try {
    chat = await database.getChat({ chat_id: req.params.chat_id })
  } catch {
    res
      .status(404)
      .json(createErrorResponse({ error: req.t("errors.invalidChat") }))
    return
  }

  req.chat = chat
  next()
}

export async function can_view_chat(
  user: User,
  chat: DBChat,
): Promise<{
  result: boolean
  order?: DBOrder
  offer_session?: DBOfferSession
}> {
  const participants = await database.getChatParticipants({
    chat_id: chat.chat_id,
  })

  let order = undefined
  if (chat.order_id) {
    order = await database.getOrder({ order_id: chat.order_id })
  }
  let session = undefined
  if (chat.session_id) {
    ;[session] = await database.getOfferSessions({ id: chat.session_id })
  }

  if (!participants.includes(user.user_id)) {
    if (order && !(await is_related_to_order(order, user))) {
      return { result: false }
    }

    if (session && !(await is_related_to_offer(user.user_id, session))) {
      return { result: false }
    }
  }

  return { result: true, order, offer_session: session }
}

export async function related_to_chat(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const user = req.user as User
  const chat = req.chat!

  const result = await can_view_chat(user, chat)

  if (!result.result) {
    res
      .status(403)
      .json(createErrorResponse({ error: req.t("errors.notAuthorized") }))
  }

  req.order = result.order || undefined
  req.offer_session = result.offer_session || undefined

  next()
}
