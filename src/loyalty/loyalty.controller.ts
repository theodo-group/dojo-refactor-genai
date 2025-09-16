import { Controller, Get, Param, Post, Body, Query } from "@nestjs/common";
import { LoyaltyService } from "./loyalty.service";
import { ParseUUIDPipe } from "../common/pipes/parse-uuid.pipe";

@Controller("loyalty")
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get("calculate/:customerId/:amount")
  async calculateDiscount(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Param("amount") amount: string
  ): Promise<{ originalAmount: number; discountedAmount: number }> {
    const numAmount = parseFloat(amount);
    const discounted = await this.loyaltyService.calculateNextOrderAmount(
      customerId,
      numAmount
    );
    return {
      originalAmount: numAmount,
      discountedAmount: discounted,
    };
  }

  // New endpoints to support full e2e coverage
  @Get("tier/:customerId")
  async getTier(
    @Param("customerId", ParseUUIDPipe) customerId: string
  ): Promise<{
    orderCount: number;
    totalSpent: number;
    currentTier: string;
    discountRate: number;
    nextTierRequirement?: { orders?: number; spending?: number };
  }> {
    return this.loyaltyService.calculateCustomerTier(customerId);
  }

  @Get("stats/:customerId")
  async getStats(
    @Param("customerId", ParseUUIDPipe) customerId: string
  ): Promise<{
    totalOrders: number;
    totalSpent: number;
    currentTier: string;
    discountEarned: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    lifetimeDiscountSaved: number;
  }> {
    return this.loyaltyService.getCustomerLoyaltyStats(customerId);
  }

  @Get("points/:customerId")
  async getPoints(
    @Param("customerId", ParseUUIDPipe) customerId: string
  ): Promise<{ points: number }> {
    const points = await this.loyaltyService.calculateLoyaltyPoints(customerId);
    return { points };
  }

  @Get("info/:customerId")
  async getInfo(@Param("customerId", ParseUUIDPipe) customerId: string) {
    return this.loyaltyService.getCustomerLoyaltyInfo(customerId);
  }

  @Get("metrics/:customerId")
  async getMetrics(@Param("customerId", ParseUUIDPipe) customerId: string) {
    return this.loyaltyService.getLoyaltyMetrics(customerId);
  }

  @Post("adjust")
  async adjustPoints(
    @Body()
    body: {
      customerId: string;
      adjustment: number;
      reason: string;
    }
  ): Promise<{
    customerId: string;
    adjustment: number;
    newBalance: number;
    reason: string;
    timestamp: Date;
  }> {
    const { customerId, adjustment, reason } = body;
    const result = await this.loyaltyService.adjustPoints(
      customerId,
      adjustment,
      reason
    );
    return result;
  }

  @Get("expired/:customerId")
  async getExpired(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Query("asOf") asOf?: string
  ): Promise<{ expiredPoints: number }> {
    const date = asOf ? new Date(asOf) : new Date();
    const expiredPoints = await this.loyaltyService.getExpiredPoints(
      customerId,
      date
    );
    return { expiredPoints };
  }

  @Post("suspend")
  async suspend(
    @Body() body: { customerId: string; reason: string }
  ): Promise<{ success: true }> {
    const { customerId, reason } = body;
    await this.loyaltyService.suspendLoyaltyProgram(customerId, reason);
    return { success: true };
  }

  @Post("reactivate/:customerId")
  async reactivate(
    @Param("customerId", ParseUUIDPipe) customerId: string
  ): Promise<{ success: true }> {
    await this.loyaltyService.reactivateLoyaltyProgram(customerId);
    return { success: true };
  }
}
