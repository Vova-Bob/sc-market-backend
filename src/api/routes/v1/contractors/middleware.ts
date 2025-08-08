import { NextFunction, Request, Response } from "express"
import { User } from "../api-models.js"
import { database } from "../../../../clients/database/knex-db.js"
import { has_permission, is_member } from "../util/permissions.js"
import { DBContractorRole } from "../../../../clients/database/db-models.js"
import { createErrorResponse } from "../util/response.js"

export async function valid_contractor(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const spectrum_id = req.params["spectrum_id"]
  try {
    req.contractor = await database.getContractor({ spectrum_id })
    next()
  } catch {
    res
      .status(400)
      .json(
        createErrorResponse({ error: req.t("contractors.invalidContractor") }),
      )
    return
  }
}

export async function org_authorized(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.isAuthenticated()) {
    const user = req.user as User
    if (user.banned) {
      res
        .status(418)
        .json(
          createErrorResponse({ error: req.t("errors.internalServer") }),
        )
      return
    }

    const spectrum_id = req.params["spectrum_id"]
    const contractor = await database.getContractor({ spectrum_id })
    if (!(await is_member(contractor.contractor_id, user.user_id))) {
      res
        .status(403)
        .json(createErrorResponse({ error: req.t("errors.unauthorized") }))
      return
    } else {
      req.contractor = contractor
      next()
    }
  } else {
    res
      .status(401)
      .json(createErrorResponse({ error: req.t("auth.unauthenticated") }))
    return
  }
}

export function org_permission(permission_name: keyof DBContractorRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      const user = req.user as User
      if (user.banned) {
        res
          .status(418)
          .json(
            createErrorResponse({ error: req.t("errors.internalServer") }),
          )
        return
      }

      const spectrum_id = req.params["spectrum_id"]
      let contractor
      try {
        contractor = await database.getContractor({ spectrum_id })
      } catch (e) {
        res
          .status(400)
          .json(
            createErrorResponse({ error: req.t("contractors.invalidContractor") }),
          )
        return
      }

      if (
        !(await has_permission(
          contractor.contractor_id,
          user.user_id,
          permission_name,
        ))
      ) {
        res
          .status(403)
          .json(createErrorResponse({ error: req.t("errors.unauthorized") }))
        return
      }

      req.contractor = contractor

      next()
    } else {
      res
        .status(401)
        .json(createErrorResponse({ error: req.t("auth.unauthenticated") }))
    }
  }
}

export function validate_optional_spectrum_id(path: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const spectrum_id = req.query[path] as string
    if (!spectrum_id) {
      return next()
    }

    let contractor
    try {
      contractor = await database.getContractor({ spectrum_id })
    } catch {
      res
        .status(404)
        .json(
          createErrorResponse({ error: req.t("contractors.notFound"), contractor }),
        )
      return
    }

    if (!req.contractors) {
      req.contractors = new Map<string, User>()
    }
    req.contractors.set(path, contractor)
    next()
  }
}
