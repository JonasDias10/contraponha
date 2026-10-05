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

type OpenApiSchema = ApiResponseSchemaHost["schema"]

export function toOpenApiSchema(schema: z.ZodType): OpenApiSchema {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io: "output" }) as OpenApiSchema
}

function toOpenApiInputSchema(schema: z.ZodType): OpenApiSchema {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io: "input" }) as OpenApiSchema
}

export function ApiZodBody(schema: z.ZodType): MethodDecorator {
  return ApiBody({ schema: toOpenApiInputSchema(schema) })
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
