import { DefineStepFunction } from 'jest-cucumber';
import { Customer } from '../../src/entities/customer.entity';
import { FixtureFactory } from '../helpers/fixture-factory';

export interface CustomerStepsContext {
  fixtureFactory: FixtureFactory;
  customers: Customer[];
}

export const defineCustomerSteps = (defineStep: DefineStepFunction, context: CustomerStepsContext) => {
  defineStep('a customer exists', async () => {
    const customer = await context.fixtureFactory.createCustomer();
    context.customers = [customer];
  });

  defineStep(/(\d+) customers exist/, async (count: string) => {
    const numCustomers = parseInt(count, 10);
    context.customers = await context.fixtureFactory.createCustomers(numCustomers);
  });
};
