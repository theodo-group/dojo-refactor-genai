import { DefineStepFunction } from "jest-cucumber";
import { Context } from "../../context";

/**
 * When step: Call an API endpoint without body
 * Example: When endpoint "/api/products" is called with "GET" method
 */
export const whenApiIsCalled = (
  when: DefineStepFunction,
  context: Context
) => {
  when(
    /^endpoint "([^"]*)" is called with "([^"]*)" method$/,
    async (endpoint: string, method: string) => {
      // Replace placeholders like {:ProductName.id} with actual values from context
      const processedEndpoint = endpoint.replace(
        /\{:([^.]+)\.([^}]+)\}/g,
        (_, entityName, property) => {
          const entity = context.data[entityName];
          if (!entity) {
            throw new Error(`Entity ${entityName} not found in context`);
          }
          return entity[property];
        }
      );

      await context.makeRequest(method, processedEndpoint);
    }
  );
};

/**
 * When step: Call an API endpoint with JSON body
 * Example: When endpoint "/api/products" is called with "POST" method and body
 *   """
 *   {
 *     "name": "Test Product"
 *   }
 *   """
 */
export const whenApiIsCalledWithBody = (
  when: DefineStepFunction,
  context: Context
) => {
  when(
    /^endpoint "([^"]*)" is called with "([^"]*)" method and body$/,
    async (endpoint: string, method: string, bodyString: string) => {
      // Replace placeholders like {:ProductName.id} with actual values from context
      const processedEndpoint = endpoint.replace(
        /\{:([^.]+)\.([^}]+)\}/g,
        (_, entityName, property) => {
          const entity = context.data[entityName];
          if (!entity) {
            throw new Error(`Entity ${entityName} not found in context`);
          }
          return entity[property];
        }
      );

      // Parse the body JSON
      const body = JSON.parse(bodyString);

      // Replace placeholders in body like {:ProductName.id}
      const processedBody = JSON.parse(
        JSON.stringify(body).replace(
          /\{:([^.]+)\.([^}]+)\}/g,
          (_, entityName, property) => {
            const entity = context.data[entityName];
            if (!entity) {
              throw new Error(`Entity ${entityName} not found in context`);
            }
            return entity[property];
          }
        )
      );

      await context.makeRequest(method, processedEndpoint, processedBody);
    }
  );
};

/**
 * When step: Call an API endpoint with query parameters
 * Example: When endpoint "/api/products" is called with "GET" method and query "category=pizza"
 */
export const whenApiIsCalledWithQuery = (
  when: DefineStepFunction,
  context: Context
) => {
  when(
    /^endpoint "([^"]*)" is called with "([^"]*)" method and query "([^"]*)"$/,
    async (endpoint: string, method: string, query: string) => {
      const fullEndpoint = `${endpoint}?${query}`;
      await context.makeRequest(method, fullEndpoint);
    }
  );
};
