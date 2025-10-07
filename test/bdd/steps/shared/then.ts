import { DefineStepFunction } from "jest-cucumber";
import { Context } from "../../context";
import { Product } from "../../../../src/entities/product.entity";
import { Customer } from "../../../../src/entities/customer.entity";

/**
 * Then step: Check response status code
 * Example: Then the response status code should be "200"
 */
export const thenResponseStatusCode = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response status code should be "([^"]*)"$/,
    (expectedStatus: string) => {
      const actualStatus = context.getResponseStatusCode();
      expect(actualStatus).toBe(parseInt(expectedStatus, 10));
    }
  );
};

/**
 * Then step: Check response body contains property with value
 * Example: Then the response body should have property "name" with value "Test Product"
 */
export const thenResponseBodyHasProperty = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body should have property "([^"]*)" with value "([^"]*)"$/,
    (property: string, value: string) => {
      const body = context.getResponseBody();
      // Convert string value to appropriate type
      let expectedValue: any = value;
      if (value === "true") expectedValue = true;
      if (value === "false") expectedValue = false;
      if (!isNaN(Number(value)) && value !== "") expectedValue = Number(value);
      expect(body[property]).toBe(expectedValue);
    }
  );
};

/**
 * Then step: Check response body is an array with specific length
 * Example: Then the response body should be an array with length "5"
 */
export const thenResponseBodyIsArrayWithLength = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body should be an array with length "([^"]*)"$/,
    (length: string) => {
      const body = context.getResponseBody();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(parseInt(length, 10));
    }
  );
};

/**
 * Then step: Check response body is an array with at least N items
 * Example: Then the response body should be an array with at least "3" items
 */
export const thenResponseBodyIsArrayWithAtLeast = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body should be an array with at least "([^"]*)" items$/,
    (minLength: string) => {
      const body = context.getResponseBody();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(parseInt(minLength, 10));
    }
  );
};

/**
 * Then step: Check response body array contains item with property value
 * Example: Then the response body should contain product with name "Margherita Pizza"
 */
export const thenResponseBodyContainsItemWithProperty = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body should contain (?:product|customer|order) with (\w+) "([^"]*)"$/,
    (property: string, value: string) => {
      const body = context.getResponseBody();
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((item: any) => item[property] === value);
      expect(found).toBeDefined();
    }
  );
};

/**
 * Then step: Check response body array does NOT contain item with property value
 * Example: Then the response body should not contain product with name "DeletedProduct"
 */
export const thenResponseBodyDoesNotContainItemWithProperty = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body should not contain (?:product|customer|order) with (\w+) "([^"]*)"$/,
    (property: string, value: string) => {
      const body = context.getResponseBody();
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((item: any) => item[property] === value);
      expect(found).toBeUndefined();
    }
  );
};

/**
 * Then step: Check response message contains text
 * Example: Then the response message should contain "already exists"
 */
export const thenResponseMessageContains = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response message should contain "([^"]*)"$/,
    (expectedText: string) => {
      const body = context.getResponseBody();
      expect(body.message).toBeDefined();

      if (Array.isArray(body.message)) {
        const messages = body.message.join(" ");
        expect(messages).toContain(expectedText);
      } else {
        expect(body.message).toContain(expectedText);
      }
    }
  );
};

/**
 * Then step: Check number of products in database
 * Example: Then 5 products should exist
 */
export const thenNumberOfProductsExist = (
  then: DefineStepFunction,
  context: Context
) => {
  then(/^(\d+) products? should exist$/, async (count: string) => {
    const products = await context.productRepository.find();
    expect(products.length).toBe(parseInt(count, 10));
  });
};

/**
 * Then step: Check number of available products
 * Example: Then 3 available products should exist
 */
export const thenNumberOfAvailableProductsExist = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^(\d+) available products? should exist$/,
    async (count: string) => {
      const products = await context.productRepository.find({
        where: { isAvailable: true },
      });
      expect(products.length).toBe(parseInt(count, 10));
    }
  );
};

/**
 * Then step: Check product is not available by name
 * Example: Then the product "SeasonalSpecial" should not be available
 */
export const thenProductShouldNotBeAvailable = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the product "([^"]*)" should not be available$/,
    async (productName: string) => {
      const product = context.data[productName] as Product;
      if (!product) {
        throw new Error(`Product ${productName} not found in context`);
      }

      const dbProduct = await context.productRepository.findOne({
        where: { id: product.id },
      });

      if (!dbProduct) {
        // Product was hard deleted or soft deleted to the point of not being found
        return;
      }

      expect(dbProduct.isAvailable).toBe(false);
    }
  );
};

/**
 * Then step: Check product does not exist in database
 * Example: Then the product "DeletedProduct" should not exist
 */
export const thenProductShouldNotExist = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the product "([^"]*)" should not exist$/,
    async (productName: string) => {
      const product = context.data[productName] as Product;
      if (!product) {
        throw new Error(`Product ${productName} not found in context`);
      }

      const dbProduct = await context.productRepository.findOne({
        where: { id: product.id },
      });

      expect(dbProduct).toBeNull();
    }
  );
};

/**
 * Then step: Check customer does not exist in active list
 * Example: Then the customer "JohnDoe" should not be in active list
 */
export const thenCustomerShouldNotBeActive = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the customer "([^"]*)" should not be in active list$/,
    async (customerName: string) => {
      const customer = context.data[customerName] as Customer;
      if (!customer) {
        throw new Error(`Customer ${customerName} not found in context`);
      }

      const dbCustomer = await context.customerRepository.findOne({
        where: { id: customer.id },
      });

      if (!dbCustomer) {
        // Customer was deleted
        return;
      }

      expect(dbCustomer.isActive).toBe(false);
    }
  );
};

/**
 * Then step: Store response body property in context
 * Example: Then store the response body as "CreatedProduct"
 */
export const thenStoreResponseBodyAs = (
  then: DefineStepFunction,
  context: Context
) => {
  then(/^store the response body as "([^"]*)"$/, (name: string) => {
    const body = context.getResponseBody();
    context.data[name] = body;
  });
};

/**
 * Then step: Check response body has property
 * Example: Then the response body should have property "id"
 */
export const thenResponseBodyHasPropertyDefined = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body should have property "([^"]*)"$/,
    (property: string) => {
      const body = context.getResponseBody();
      expect(body[property]).toBeDefined();
    }
  );
};

/**
 * Then step: Check response body property equals another property from context
 * Example: Then the response body property "customerId" should equal "{:JohnDoe.id}"
 */
export const thenResponseBodyPropertyEquals = (
  then: DefineStepFunction,
  context: Context
) => {
  then(
    /^the response body property "([^"]*)" should equal "([^"]*)"$/,
    (property: string, expectedValue: string) => {
      const body = context.getResponseBody();

      // Replace placeholders like {:ProductName.id}
      const processedValue = expectedValue.replace(
        /\{:([^.]+)\.([^}]+)\}/g,
        (_, entityName, prop) => {
          const entity = context.data[entityName];
          if (!entity) {
            throw new Error(`Entity ${entityName} not found in context`);
          }
          return entity[prop];
        }
      );

      // Convert expected value to match the type of the actual value
      let finalValue: any = processedValue;
      const actualValue = body[property];

      if (typeof actualValue === "boolean") {
        if (processedValue === "true") finalValue = true;
        if (processedValue === "false") finalValue = false;
      } else if (typeof actualValue === "number") {
        if (!isNaN(Number(processedValue)) && processedValue !== "") {
          finalValue = Number(processedValue);
        }
      }
      // Otherwise keep as string

      expect(actualValue).toBe(finalValue);
    }
  );
};
