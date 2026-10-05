import type { Messages } from "../../types.js"

export const common: Messages["common"] = {
  errors: {
    badRequest: "The request could not be processed.",
    validationFailed: "Some of the submitted data is invalid.",
    unauthorized: "You need to be signed in to continue.",
    forbidden: "You are not allowed to perform this action.",
    notFound: "The requested resource was not found.",
    conflict: "The request conflicts with the current state of the resource.",
    payloadTooLarge: "The submitted content exceeds the allowed size.",
    tooManyRequests: "Too many requests in a short time. Please try again shortly.",
    internal: "An unexpected error occurred. Please try again later.",
    serviceUnavailable: "The service is temporarily unavailable.",
  },
}
