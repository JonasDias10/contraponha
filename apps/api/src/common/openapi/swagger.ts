import type { INestApplication } from "@nestjs/common"
import { DocumentBuilder, SwaggerModule, type ApiResponseSchemaHost } from "@nestjs/swagger"
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX, REQUEST_ID_HEADER } from "@ponto/config"
import { z } from "zod"

export const SWAGGER_PATH = `${API_GLOBAL_PREFIX}/docs`

export function toOpenApiSchema(schema: z.ZodType): ApiResponseSchemaHost["schema"] {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "output",
  }) as ApiResponseSchemaHost["schema"]
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Ponto API")
      .setDescription("Public HTTP API of the Ponto platform.")
      .setVersion(API_DEFAULT_VERSION)
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
