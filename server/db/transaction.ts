import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isWriteConflict } from "./write-conflict";

// All content writes use this boundary. Serializable retries cover concurrent
// max(order)+1 inserts and read/modify/write reordering, including deletes.
export async function contentTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000, timeout: 20000,
      });
    } catch (error) {
      if (!isWriteConflict(error) || attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt + Math.random() * 50));
    }
  }
}
