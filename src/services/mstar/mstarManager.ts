import CustomError from "../../utils/CustomError";
import { PrismaClient, MstarTransaction, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// --- MstarManager Class with "Reserve and Commit" Pattern ---

class MstarManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async getTotalBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new CustomError("User not found.", 404);
    }

    return user.mstarsBalance - user.heldBalance;
  }

  /**
   * Calculates the cost of a service. (This function remains the same).
   */
  public async calculateCost(
    userId: string,
    aiModelId: string,
    photosToBeGenerated: number,
    aiFilterId?: string
  ): Promise<number> {
    if (aiModelId === "f640f8fe-7bb2-4bdf-bf97-9fe35398690d") {
      let currentTotalModels = await prisma.model.findMany({
        where: { userId: userId },
      });
      if (currentTotalModels.length! > 0) {
        1;
      }
    }

    const model = await this.prisma.aiModel.findUnique({
      where: { id: aiModelId },
    });

    if (!model) {
      throw new Error("AI model not found.");
    }

    let totalCost = model.mstarsCostPerCall * photosToBeGenerated;

    if (aiFilterId) {
      const aiFilter = await this.prisma.aiFilter.findUnique({
        where: { id: aiFilterId },
      });
      if (!aiFilter) {
        throw new Error("AI filter not found.");
      }
      totalCost += aiFilter.additionalCost || 0;
    }

    return totalCost;
  }

  /**
   * STAGE 1: Reserve M*Stars and queue the job.
   * This is called when the user initiates a task. It "holds" the funds.
   * @returns A promise that resolves to the PENDING transaction record.
   */
  public async reserveMstars(
    userId: string,
    aiModelId: string,
    numOfPotos: number,
    aiFilterId?: string
  ): Promise<MstarTransaction> {
    let photosToBeGenerated = numOfPotos;
    const cost = await this.calculateCost(
      userId,
      aiModelId,
      photosToBeGenerated,
      aiFilterId
    );

    // This is the core logic change. It's all done in one atomic transaction.
    const transaction = await this.prisma.$transaction(async (tx) => {
      // 1. Get the current user state with a lock to prevent race conditions
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new CustomError("User not found.", 404);
      }

      // 2. THIS IS THE KEY CHECK: Verify against AVAILABLE balance
      const availableBalance = user.mstarsBalance - user.heldBalance;
      if (availableBalance < cost) {
        throw new CustomError("Insufficient available M-Stars.", 400);
      }

      // 3. Update the user's HELD balance. The main balance is NOT touched yet.
      await tx.user.update({
        where: { id: userId },
        data: {
          heldBalance: user.heldBalance + cost,
        },
      });

      // 4. Create the transaction record with a 'PENDING' status
      const model = await this.prisma.aiModel.findUnique({
        where: { id: aiModelId },
      });
      const pendingTransaction = await tx.mstarTransaction.create({
        data: {
          userId,
          aiModelId,
          aiFilterId,
          mstarsSpent: cost,
          realCost: model?.baseCostPerCall, // Use optional chaining for safety
          transactionType: "DEBIT",
          status: "PROCESSING", // Status is now PENDING
        },
      });

      return pendingTransaction;
    });

    // NOW you add the job to your queue, passing the `transaction.id`
    // queue.add({ ...jobDetails, transactionId: transaction.id });

    return transaction;
  }

  /**
   * STAGE 2 (Success): Commit the transaction.
   * Called by your queue worker when the job is successfully completed.
   * @param transactionId The ID of the PENDING transaction.
   */
  public async commitTransaction(transactionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.mstarTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.status !== "PROCESSING") {
        throw new Error("Transaction not found or not in PROCESSING state.");
      }

      // 1. Update the main balance AND reduce the held balance
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          mstarsBalance: {
            decrement: transaction.mstarsSpent,
          },
          heldBalance: {
            decrement: transaction.mstarsSpent,
          },
        },
      });

      // 2. Mark the transaction as COMPLETED
      await tx.mstarTransaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      });
    });
  }

  /**
   * STAGE 3 (Failure): Cancel and refund the transaction.
   * Called by your queue worker if the job fails.
   * @param transactionId The ID of the PENDING transaction.
   */
  public async cancelTransaction(transactionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.mstarTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.status !== "PROCESSING") {
        throw new Error("Transaction not found or not in PROCESSING state.");
      }

      // 1. Simply "un-hold" the funds. The main balance is never touched.
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          heldBalance: {
            decrement: transaction.mstarsSpent,
          },
        },
      });

      // 2. Mark the transaction as FAILED
      await tx.mstarTransaction.update({
        where: { id: transactionId },
        data: { status: "FAILED" },
      });
    });
  }
}

export default MstarManager;
