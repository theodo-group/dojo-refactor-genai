import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

@Injectable()
export class LoyaltyService {
  // Progressive discount rates based on order count
  private readonly DISCOUNT_TIERS = [
    { minOrders: 1, discountRate: 0 },     // No discount for 1-2 orders
    { minOrders: 3, discountRate: 0.05 },  // 5% discount for 3-5 orders
    { minOrders: 6, discountRate: 0.10 },  // 10% discount for 6-10 orders
    { minOrders: 11, discountRate: 0.15 }, // 15% discount for 11+ orders
  ];

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * Calculate the next order amount with progressive discount based on order history
   */
  async calculateNextOrderAmount(
    customerId: string,
    totalAmount: number,
  ): Promise<number> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const count = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.customerId = :customerId', { customerId })
      .andWhere('order.createdAt >= :oneMonthAgo', { oneMonthAgo: oneMonthAgo.toISOString() })
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
}
