import { describe, it } from "node:test"
import assert from "node:assert"
import express from "express"
import {
  i18nMiddleware,
  addTranslationToRequest,
  RequestWithI18n,
} from "../../src/api/routes/v1/util/i18n.js"

const app = express()
app.use(i18nMiddleware)
app.use((req: RequestWithI18n, _res, next) => {
  if (req.query.lng) {
    req.language = req.query.lng as string
  } else if (req.headers["accept-language"]) {
    req.language = (req.headers["accept-language"] as string).split(",")[0]
  }
  next()
})
app.use(addTranslationToRequest)
app.get("/test", (req: RequestWithI18n, res) => {
  res.json({ message: req.t("success.generic") })
})

function startServer() {
  return new Promise<{ server: any; url: string }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as { port: number }
      resolve({ server, url: `http://localhost:${address.port}` })
    })
  })
}

describe("i18n middleware", () => {
  it("responds in Ukrainian via ?lng=uk", async () => {
    const { server, url } = await startServer()
    const res = await fetch(`${url}/test?lng=uk`)
    const body = await res.json()
    assert.strictEqual(body.message, "Успіх")
    server.close()
  })

  it("responds in English via ?lng=en", async () => {
    const { server, url } = await startServer()
    const res = await fetch(`${url}/test?lng=en`)
    const body = await res.json()
    assert.strictEqual(body.message, "Success")
    server.close()
  })

  it("responds in Ukrainian via Accept-Language", async () => {
    const { server, url } = await startServer()
    const res = await fetch(`${url}/test`, {
      headers: { "Accept-Language": "uk" },
    })
    const body = await res.json()
    assert.strictEqual(body.message, "Успіх")
    server.close()
  })

  it("falls back to English for unsupported language", async () => {
    const { server, url } = await startServer()
    const res = await fetch(`${url}/test?lng=zz`)
    const body = await res.json()
    assert.strictEqual(body.message, "Success")
    server.close()
  })
})
