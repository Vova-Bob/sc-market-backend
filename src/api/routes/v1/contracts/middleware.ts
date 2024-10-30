import { database } from "../../../../clients/database/knex-db.js"
import { DBPublicContract } from "./types.js"
import { createErrorResponse } from "../util/response.js"
import { NextFunction, Request, Response } from "express"

export async function valid_public_contract(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const contract_id = req.params["contract_id"]

  const contract = await database
    .knex<DBPublicContract>("public_contracts")
    .where({ id: contract_id, status: "active" })
    .first()

  if (!contract) {
    return res
      .status(404)
      .json(createErrorResponse({ message: "Invalid public contract" }))
  }

  req.contract = contract

  next()
}
