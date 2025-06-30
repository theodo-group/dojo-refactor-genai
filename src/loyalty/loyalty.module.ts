import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../entities/order.entity";
import { Customer } from "../entities/customer.entity";
import { LoyaltyService } from "./loyalty.service";
import { LoyaltyController } from "./loyalty.controller";
import { OrderModule } from "../order/order.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Customer]),
    forwardRef(() => OrderModule),
  ],
  providers: [LoyaltyService],
  controllers: [LoyaltyController],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
