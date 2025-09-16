import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

@Injectable()
export class LoyaltyService {
  private readonly DISCOUNT_RATE = 0.1;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * Calculate the next order amount, applying 10% discount if customer had >3 orders in the last month
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
    const eligible = count > 3;

    const finalAmount = eligible ? totalAmount * (1 - this.DISCOUNT_RATE) : totalAmount;
    return parseFloat(finalAmount.toFixed(2));
  }
}
