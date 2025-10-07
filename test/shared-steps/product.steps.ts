import { DefineStepFunction } from 'jest-cucumber';
import { Context } from '../context';

export const givenTheProductExists = (given: DefineStepFunction, context: Context) => {
  given(/^the product "([^"]*)" exists$/, async (productName) => {
    const product = context.getProductRepository().create({
      name: productName,
      description: `Description for ${productName}`,
      price: 10.99,
      category: 'default',
      isAvailable: true,
    });

    const savedProduct = await context.getProductRepository().save(product);
    context.data[productName] = savedProduct;
  });
};

export const givenTheProductExistsWithPrice = (given: DefineStepFunction, context: Context) => {
  given(/^the product "([^"]*)" exists with price "([^"]*)"$/, async (productName, price) => {
    const product = context.getProductRepository().create({
      name: productName,
      description: `Description for ${productName}`,
      price: parseFloat(price),
      category: 'default',
      isAvailable: true,
    });

    const savedProduct = await context.getProductRepository().save(product);
    context.data[productName] = savedProduct;
  });
};

export const givenTheProductExistsWithDetails = (given: DefineStepFunction, context: Context) => {
  given(/^the product "([^"]*)" exists with price "([^"]*)" and category "([^"]*)"$/, async (productName, price, category) => {
    const product = context.getProductRepository().create({
      name: productName,
      description: `Description for ${productName}`,
      price: parseFloat(price),
      category: category,
      isAvailable: true,
    });

    const savedProduct = await context.getProductRepository().save(product);
    context.data[productName] = savedProduct;
  });
};
