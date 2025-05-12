import { Controller, Get, Param, Post } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('calculate/:customerId/:amount')
  async calculateDiscount(
    @Param('customerId') customerId: string,
    @Param('amount') amount: string,
  ): Promise<{ originalAmount: number; discountedAmount: number }> {
    const numAmount = parseFloat(amount);
    const discounted = await this.loyaltyService.calculateNextOrderAmount(customerId, numAmount);
    return {
      originalAmount: numAmount,
      discountedAmount: discounted,
    };
  }
}
