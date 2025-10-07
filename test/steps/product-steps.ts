import { DefineStepFunction } from 'jest-cucumber';
import { Product } from '../../src/entities/product.entity';
import { FixtureFactory } from '../helpers/fixture-factory';

export interface ProductStepsContext {
  fixtureFactory: FixtureFactory;
  products: Product[];
}

export const defineProductSteps = (defineStep: DefineStepFunction, context: ProductStepsContext) => {
  defineStep(/(\d+) products? exists?/, async (count: string) => {
    const numProducts = parseInt(count, 10);
    context.products = await context.fixtureFactory.createProducts(numProducts);
  });
};
