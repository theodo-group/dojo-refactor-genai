import { DefineStepFunction } from 'jest-cucumber';
import { Context } from '../context';

export const givenTheCustomerExists = (given: DefineStepFunction, context: Context) => {
  given(/^the customer "([^"]*)" exists$/, async (customerName) => {
    const customer = context.getCustomerRepository().create({
      name: customerName,
      email: `${customerName.toLowerCase()}@example.com`,
      phone: '123-456-7890',
      address: '123 Main St',
      isActive: true,
    });

    const savedCustomer = await context.getCustomerRepository().save(customer);
    context.data[customerName] = savedCustomer;
  });
};

export const givenTheCustomerExistsWithDetails = (given: DefineStepFunction, context: Context) => {
  given(/^the customer "([^"]*)" exists with email "([^"]*)" and phone "([^"]*)"$/, async (customerName, email, phone) => {
    const customer = context.getCustomerRepository().create({
      name: customerName,
      email: email,
      phone: phone,
      address: '123 Main St',
      isActive: true,
    });

    const savedCustomer = await context.getCustomerRepository().save(customer);
    context.data[customerName] = savedCustomer;
  });
};
