import { randomUUID } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"

import { API_BASE_PATH, REQUEST_ID_HEADER } from "@ponto/config"
import { isValidRequestId } from "@ponto/validation"
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

export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER]
  const requestId = isValidRequestId(incoming) ? incoming : randomUUID()
  res.setHeader(REQUEST_ID_HEADER, requestId)
  return requestId
}

function stripQueryString(url: string | undefined): string | undefined {
  return url?.split("?")[0]
}

export function buildLoggerParams(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.log.level,
      base: { service: "ponto-api", env: config.nodeEnv },
      timestamp: stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
      genReqId: resolveRequestId,
      customAttributeKeys: { reqId: "requestId" },
      quietReqLogger: true,
      autoLogging: { ignore: (req) => req.url?.startsWith(HEALTH_PATH_PREFIX) ?? false },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) {
          return "error"
        }

        return res.statusCode >= 400 ? "warn" : "info"
      },
      serializers: {
        req: (req: { id: unknown; method: string; url?: string }) => ({
          id: req.id,
          method: req.method,
          path: stripQueryString(req.url),
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      transport: config.log.pretty
        ? { target: "pino-pretty", options: { singleLine: true, translateTime: "SYS:HH:MM:ss.l" } }
        : undefined,
    },
  }
}
