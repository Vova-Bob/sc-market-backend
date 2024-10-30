import { DBContractor } from "../database/db-models.js"
import {
  DBChat,
  DBOffer,
  DBOfferSession,
  DBOrder,
} from "../../clients/database/db-models.js"
import { DBPublicContract } from "../../api/routes/v1/contracts/types.js"

declare global {
  declare namespace Express {
    interface Request {
      contractor?: DBContractor
      order?: DBOrder
      offer_session?: DBOfferSession
      most_recent_offer?: DBOffer
      contract?: DBPublicContract
      chat?: DBChat
    }
  }
}
