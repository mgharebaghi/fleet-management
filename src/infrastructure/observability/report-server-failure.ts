const SAFE_CATEGORIES = new Set(["Error", "TypeError", "RangeError", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError", "PrismaClientInitializationError"]);

export function reportServerFailure(operation: "trip.write" | "trip.create" | "trip.assign" | "drivers.write", error: unknown): void {
  const category = error instanceof Error && SAFE_CATEGORIES.has(error.name) ? error.name : "UnknownError";
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : undefined;
  console.error("Server operation failed", { operation, category, ...(code ? { code } : {}) });
}
