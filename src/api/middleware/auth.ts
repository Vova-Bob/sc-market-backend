import { NextFunction, Request, Response } from "express"
import { User } from "../routes/v1/api-models.js"
import { RequestWithI18n } from "../routes/v1/util/i18n.js"

export function pageAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.redirect("/auth/discord")
  }
}

export async function guestAuthorized(
  req: RequestWithI18n,
  res: Response,
  next: NextFunction,
) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.status(401).json({ error: req.t("auth.unauthenticated") })
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err)
  }

  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
    validationErrors: err.validationErrors,
  })
}

export async function userAuthorized(
  req: RequestWithI18n,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.isAuthenticated()) {
      const user = req.user as User
      if (user.banned) {
        res.status(418).json({ error: req.t("errors.internalServer") })
        return
      }
      if (user.role === "user" || user.role === "admin") {
        next()
        return
      } else {
        res.status(403).json({ error: req.t("errors.unauthorized") })
        return
      }
    } else {
      res.status(401).json({ error: req.t("auth.unauthenticated") })
      return
    }
  } catch (e) {
    console.error(e)
    res.status(400)
    return
  }
}

export async function verifiedUser(
  req: RequestWithI18n,
  res: Response,
  next: NextFunction,
) {
  if (req.isAuthenticated()) {
    const user = req.user as User
    if (user.banned) {
      res.status(418).json({ error: req.t("errors.internalServer") })
      return
    }
    if (!user.rsi_confirmed) {
      res.status(401).json({ error: req.t("auth.notVerified") })
      return
    } else {
      next()
      return
    }
  } else {
    res.status(401).json({ error: req.t("auth.unauthenticated") })
    return
  }
}

export function adminAuthorized(
  req: RequestWithI18n,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated()) {
    const user = req.user as User
    if (user.banned) {
      res.status(418).json({ error: req.t("errors.internalServer") })
      return
    }
    if (user.role === "admin") {
      next()
    } else {
      res.status(403).json({ error: req.t("errors.unauthorized") })
      return
    }
  } else {
    res.status(401).json({ error: req.t("auth.unauthenticated") })
  }
}

// Don't try to make this file depend on `database` or everything will break
