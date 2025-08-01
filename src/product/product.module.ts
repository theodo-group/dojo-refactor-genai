import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { Product } from "../entities/product.entity";
import { Order } from "../entities/order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
