import {
  DBOffer,
  DBOfferSession,
} from "../../../../clients/database/db-models.js"
import { has_permission } from "../util/permissions.js"
import { User } from "../api-models.js"

export async function is_related_to_offer(
  user_id: string,
  session: DBOfferSession,
) {
  if (user_id === session.customer_id) {
    return true
  }

  if (user_id === session.assigned_id) {
    return true
  }

  if (session.contractor_id) {
    return has_permission(session.contractor_id, user_id, "manage_orders")
  }

  return false
}

export async function can_respond_to_offer_helper(
  session: DBOfferSession,
  mostRecent: DBOffer,
  user: User,
) {
  if (session.status !== "active") {
    return false
  }

  const last_action_by_customer = mostRecent.actor_id === session.customer_id
  const is_customer = user.user_id === session.customer_id

  if (session.contractor_id) {
    // If contractor and last action by customer, contractor must respond
    if (last_action_by_customer) {
      if (
        !(await has_permission(
          session.contractor_id,
          user.user_id,
          "manage_orders",
        ))
      ) {
        return false
      }
    } else {
      if (!is_customer) {
        return false
      }
    }
  } else {
    // If assigned and last action by customer, assigned must respond
    if (last_action_by_customer) {
      if (user.user_id !== session.assigned_id) {
        return false
      }
    } else {
      if (!is_customer) {
        return false
      }
    }
  }
  return true
}
