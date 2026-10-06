/** The pg adapter can surface commit conflicts without Prisma's P2034 wrapper. */
export function isWriteConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ("code" in error && error.code === "P2034") return true;
  return error.name === "DriverAdapterError" && typeof error.cause === "object" &&
    error.cause !== null && "kind" in error.cause && error.cause.kind === "TransactionWriteConflict";
}
