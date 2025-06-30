import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "../entities/order.entity";
import { Customer } from "../entities/customer.entity";

// Add interfaces for loyalty data structures
export interface LoyaltyInfo {
  customerId: string;
  loyaltyPoints: number;
  currentTier: string;
  isActive: boolean;
  lastUpdated: Date;
}

export interface LoyaltyMetrics {
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  currentBalance: number;
  tierStatus: string;
  nextTierRequirement: number;
  lifetimeValue: number;
}

@Injectable()
export class LoyaltyService {
  // Progressive discount rates based on order count
  private readonly DISCOUNT_TIERS = [
    { minOrders: 0, discountRate: 0 }, // No discount for 0-3 orders
    { minOrders: 4, discountRate: 0.05 }, // 5% discount for 4-5 orders
    { minOrders: 6, discountRate: 0.1 }, // 10% discount for 6-10 orders
    { minOrders: 11, discountRate: 0.15 }, // 15% discount for 11+ orders
  ];

  // Spending-based discount tiers
  private readonly SPENDING_TIERS = [
    { minSpending: 0, discountRate: 0 },
    { minSpending: 100, discountRate: 0.03 }, // 3% discount for $100+
    { minSpending: 250, discountRate: 0.07 }, // 7% discount for $250+
    { minSpending: 500, discountRate: 0.12 }, // 12% discount for $500+
  ];

  // Points configuration
  private readonly POINTS_PER_DOLLAR = 1;
  private readonly POINT_VALUE = 0.01; // $0.01 per point
  private readonly MAX_POINT_ADJUSTMENT = 10000;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>
  ) {}

  /**
   * Calculate the next order amount with progressive discount based on order history
   */
  async calculateNextOrderAmount(
    customerId: string,
    totalAmount: number
  ): Promise<number> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const count = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.customerId = :customerId", { customerId })
      .andWhere("order.createdAt >= :oneMonthAgo", {
        oneMonthAgo: oneMonthAgo.toISOString(),
      })
      .andWhere("order.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [OrderStatus.CANCELLED],
      })
      .getCount();

    const discountRate = this.getDiscountRate(count);
    const finalAmount = totalAmount * (1 - discountRate);
    return parseFloat(finalAmount.toFixed(2));
  }

  /**
   * Get discount rate based on order count
   */
  private getDiscountRate(orderCount: number): number {
    // Find the highest tier the customer qualifies for
    let applicableRate = 0;
    for (const tier of this.DISCOUNT_TIERS) {
      if (orderCount >= tier.minOrders) {
        applicableRate = tier.discountRate;
      }
    }
    return applicableRate;
  }

  /**
   * Calculate customer loyalty tier based on order history and spending
   */
  async calculateCustomerTier(customerId: string): Promise<{
    orderCount: number;
    totalSpent: number;
    currentTier: string;
    discountRate: number;
    nextTierRequirement?: { orders?: number; spending?: number };
  }> {
    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.customerId = :customerId", { customerId })
      .andWhere("order.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [OrderStatus.CANCELLED],
      })
      .getMany();

    const orderCount = orders.length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount.toString()),
      0
    );

    const orderDiscountRate = this.getDiscountRate(orderCount);
    const spendingDiscountRate = this.getSpendingDiscountRate(totalSpent);
    const finalDiscountRate = Math.max(orderDiscountRate, spendingDiscountRate);

    let tierName = "Bronze";
    if (orderCount >= 11 || totalSpent >= 500) tierName = "Platinum";
    else if (orderCount >= 6 || totalSpent >= 250) tierName = "Gold";
    else if (orderCount >= 3 || totalSpent >= 100) tierName = "Silver";

    return {
      orderCount,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      currentTier: tierName,
      discountRate: finalDiscountRate,
      nextTierRequirement: this.getNextTierRequirement(orderCount, totalSpent),
    };
  }

  /**
   * Get comprehensive loyalty statistics for a customer
   */
  async getCustomerLoyaltyStats(customerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    currentTier: string;
    discountEarned: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    lifetimeDiscountSaved: number;
  }> {
    const tierInfo = await this.calculateCustomerTier(customerId);

    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.customerId = :customerId", { customerId })
      .andWhere("order.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [OrderStatus.CANCELLED],
      })
      .orderBy("order.createdAt", "DESC")
      .getMany();

    const averageOrderValue =
      orders.length > 0 ? tierInfo.totalSpent / orders.length : 0;

    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : undefined;

    // Calculate lifetime discount saved (approximate)
    const lifetimeDiscountSaved = orders.reduce((saved, order) => {
      // Estimate original price before discount
      const estimatedOriginalPrice =
        order.totalAmount / (1 - tierInfo.discountRate);
      return saved + (estimatedOriginalPrice - order.totalAmount);
    }, 0);

    return {
      totalOrders: tierInfo.orderCount,
      totalSpent: tierInfo.totalSpent,
      currentTier: tierInfo.currentTier,
      discountEarned: tierInfo.discountRate,
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      lastOrderDate,
      lifetimeDiscountSaved: parseFloat(lifetimeDiscountSaved.toFixed(2)),
    };
  }

  /**
   * Get spending-based discount rate
   */
  private getSpendingDiscountRate(totalSpent: number): number {
    let applicableRate = 0;
    for (const tier of this.SPENDING_TIERS) {
      if (totalSpent >= tier.minSpending) {
        applicableRate = tier.discountRate;
      }
    }
    return applicableRate;
  }

  /**
   * Get requirements for next loyalty tier
   */
  private getNextTierRequirement(
    orderCount: number,
    totalSpent: number
  ): { orders?: number; spending?: number } | undefined {
    const nextOrderTier = this.DISCOUNT_TIERS.find(
      (tier) => orderCount < tier.minOrders
    );
    const nextSpendingTier = this.SPENDING_TIERS.find(
      (tier) => totalSpent < tier.minSpending
    );

    if (!nextOrderTier && !nextSpendingTier) return undefined;

    return {
      orders: nextOrderTier ? nextOrderTier.minOrders - orderCount : undefined,
      spending: nextSpendingTier
        ? nextSpendingTier.minSpending - totalSpent
        : undefined,
    };
  }

  /**
   * Get comprehensive loyalty information for a customer
   */
  async getCustomerLoyaltyInfo(customerId: string): Promise<LoyaltyInfo> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new BadRequestException("Customer not found");
    }

    const tierInfo = await this.calculateCustomerTier(customerId);
    const points = await this.calculateLoyaltyPoints(customerId);

    return {
      customerId,
      loyaltyPoints: points,
      currentTier: tierInfo.currentTier,
      isActive: customer.isActive,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate loyalty points for a customer
   */
  async calculateLoyaltyPoints(customerId: string): Promise<number> {
    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.customerId = :customerId", { customerId })
      .andWhere("order.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [OrderStatus.CANCELLED],
      })
      .getMany();

    const totalSpent = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    return Math.floor(totalSpent * this.POINTS_PER_DOLLAR);
  }

  /**
   * Get loyalty metrics for a customer
   */
  async getLoyaltyMetrics(customerId: string): Promise<LoyaltyMetrics> {
    const tierInfo = await this.calculateCustomerTier(customerId);
    const totalPointsEarned = await this.calculateLoyaltyPoints(customerId);
    const totalPointsRedeemed = 0; // This would be tracked in a separate table in real implementation

    return {
      totalPointsEarned,
      totalPointsRedeemed,
      currentBalance: totalPointsEarned - totalPointsRedeemed,
      tierStatus: tierInfo.currentTier,
      nextTierRequirement: tierInfo.nextTierRequirement?.orders || 0,
      lifetimeValue: tierInfo.totalSpent,
    };
  }

  /**
   * Adjust customer loyalty points
   */
  async adjustPoints(
    customerId: string,
    pointAdjustment: number,
    reason: string
  ): Promise<any> {
    if (Math.abs(pointAdjustment) > this.MAX_POINT_ADJUSTMENT) {
      throw new BadRequestException(
        `Point adjustment exceeds maximum allowed value of ${this.MAX_POINT_ADJUSTMENT}`
      );
    }

    const currentInfo = await this.getCustomerLoyaltyInfo(customerId);
    const newBalance = Math.max(0, currentInfo.loyaltyPoints + pointAdjustment);

    // In a real implementation, this would create a record in a loyalty_transactions table
    return {
      customerId,
      adjustment: pointAdjustment,
      newBalance,
      reason,
      timestamp: new Date(),
    };
  }

  /**
   * Get expired points for a customer
   */
  async getExpiredPoints(customerId: string, asOfDate: Date): Promise<number> {
    // In a real implementation, this would check point expiration dates
    // For now, return 0 as points don't expire in our simple system
    return 0;
  }

  /**
   * Suspend a customer's loyalty program
   */
  async suspendLoyaltyProgram(
    customerId: string,
    reason: string
  ): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new BadRequestException("Customer not found");
    }

    // In a real implementation, this would update a loyalty_status field
    // For now, we'll set isActive to false
    customer.isActive = false;
    await this.customerRepository.save(customer);
  }

  /**
   * Reactivate a customer's loyalty program
   */
  async reactivateLoyaltyProgram(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new BadRequestException("Customer not found");
    }

    customer.isActive = true;
    await this.customerRepository.save(customer);
  }
}
