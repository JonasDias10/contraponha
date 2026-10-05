import { applyDecorators, type INestApplication } from "@nestjs/common"
import {
  ApiBody,
  ApiDefaultResponse,
  DocumentBuilder,
  SwaggerModule,
  type ApiResponseSchemaHost,
} from "@nestjs/swagger"
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX, REQUEST_ID_HEADER } from "@ponto/config"
import { apiErrorResponseSchema } from "@ponto/validation"
import { z } from "zod"

export const SWAGGER_PATH = `${API_GLOBAL_PREFIX}/docs`
export const SESSION_SECURITY_SCHEME = "session"

export function toOpenApiSchema(
  schema: z.ZodType,
  io: "input" | "output" = "output",
): ApiResponseSchemaHost["schema"] {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io }) as ApiResponseSchemaHost["schema"]
}

export function ApiZodBody(schema: z.ZodType): MethodDecorator {
  return ApiBody({ schema: toOpenApiSchema(schema, "input") })
}

export function ApiStandardErrors(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiDefaultResponse({
      description: "Standard error envelope",
      schema: toOpenApiSchema(apiErrorResponseSchema),
    }),
  )
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Ponto API")
      .setDescription("Public HTTP API of the Ponto platform.")
      .setVersion(API_DEFAULT_VERSION)
      .addBearerAuth(
        { type: "http", scheme: "bearer", description: "Session token from login or register" },
        SESSION_SECURITY_SCHEME,
      )
      .addGlobalParameters({
        name: REQUEST_ID_HEADER,
        in: "header",
        required: false,
        schema: { type: "string" },
      })
      .build(),
  )
  SwaggerModule.setup(SWAGGER_PATH, app, document)
}
