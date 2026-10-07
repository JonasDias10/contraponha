import { randomUUID } from "node:crypto"

import { API_BASE_PATH, REQUEST_ID_HEADER } from "@contraponha/config"
import { isValidRequestId } from "@contraponha/validation"
import type { Params } from "nestjs-pino"
import { stdTimeFunctions } from "pino"

import type { AppConfig } from "#src/config/app-config.js"

const REDACTED_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "secret",
  "*.secret",
  "authorization",
  "*.authorization",
  "cookie",
  "*.cookie",
  'headers["set-cookie"]',
]

const HEALTH_PATH_PREFIX = `${API_BASE_PATH}/health`

function stripQueryString(url: string | undefined): string | undefined {
  return url?.split("?")[0]
}

interface SerializableRequest {
  id: unknown
  method: string
  url?: string
}

interface SerializableResponse {
  statusCode: number
}

export function buildLoggerParams(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.log.level,
      base: { service: "contraponha-api", env: config.nodeEnv },
      timestamp: stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
      genReqId: (req, res) => {
        const incoming = req.headers[REQUEST_ID_HEADER]
        const requestId = isValidRequestId(incoming) ? incoming : randomUUID()

        res.setHeader(REQUEST_ID_HEADER, requestId)

        return requestId
      },
      customAttributeKeys: { reqId: "requestId" },
      quietReqLogger: true,
      autoLogging: { ignore: (req) => req.url?.startsWith(HEALTH_PATH_PREFIX) ?? false },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return "error"

        return res.statusCode >= 400 ? "warn" : "info"
      },
      serializers: {
        req: (req: SerializableRequest) => ({
          id: req.id,
          method: req.method,
          path: stripQueryString(req.url),
        }),
        res: (res: SerializableResponse) => ({ statusCode: res.statusCode }),
      },
      transport: config.log.pretty
        ? { target: "pino-pretty", options: { singleLine: true, translateTime: "SYS:HH:MM:ss.l" } }
        : undefined,
    },
  }
}
