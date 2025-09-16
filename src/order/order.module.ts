import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { Order } from "../entities/order.entity";
import { CustomerModule } from "../customer/customer.module";
import { ProductModule } from "../product/product.module";
import { LoyaltyModule } from "../loyalty/loyalty.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    CustomerModule,
    ProductModule,
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
