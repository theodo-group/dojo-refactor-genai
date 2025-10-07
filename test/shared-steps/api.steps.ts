import { DefineStepFunction } from 'jest-cucumber';
import { Context } from '../context';
import * as request from 'supertest';

// Helper function to replace context variables in URL/body
function replaceContextVariables(str: string, context: Context): string {
  return str.replace(/\{:([^.}]+)\.([^}]+)\}/g, (match, entityName, property) => {
    const entity = context.data[entityName];
    return entity ? entity[property] : match;
  });
}

export const whenGetRequestIsMadeTo = (when: DefineStepFunction, context: Context) => {
  when(/^a GET request is made to "([^"]*)"$/, async (endpoint) => {
    const resolvedEndpoint = replaceContextVariables(endpoint, context);
    context.response = await request(context.app.getHttpServer())
      .get(resolvedEndpoint);
  });
};

export const whenPostRequestIsMadeToWithBody = (when: DefineStepFunction, context: Context) => {
  when(/^a POST request is made to "([^"]*)" with body:$/, async (endpoint, body) => {
    const resolvedEndpoint = replaceContextVariables(endpoint, context);
    const resolvedBody = JSON.parse(replaceContextVariables(body, context));
    context.response = await request(context.app.getHttpServer())
      .post(resolvedEndpoint)
      .send(resolvedBody);
  });
};

export const whenPatchRequestIsMadeToWithBody = (when: DefineStepFunction, context: Context) => {
  when(/^a PATCH request is made to "([^"]*)" with body:$/, async (endpoint, body) => {
    const resolvedEndpoint = replaceContextVariables(endpoint, context);
    const resolvedBody = JSON.parse(replaceContextVariables(body, context));
    context.response = await request(context.app.getHttpServer())
      .patch(resolvedEndpoint)
      .send(resolvedBody);
  });
};

export const whenDeleteRequestIsMadeTo = (when: DefineStepFunction, context: Context) => {
  when(/^a DELETE request is made to "([^"]*)"$/, async (endpoint) => {
    const resolvedEndpoint = replaceContextVariables(endpoint, context);
    context.response = await request(context.app.getHttpServer())
      .delete(resolvedEndpoint);
  });
};

export const thenTheResponseStatusCodeShouldBe = (then: DefineStepFunction, context: Context) => {
  then(/^the response status code should be (\d+)$/, async (statusCode) => {
    expect(context.response.status).toBe(parseInt(statusCode));
  });
};

export const thenTheResponseShouldBeAnArray = (then: DefineStepFunction, context: Context) => {
  then(/^the response should be an array$/, async () => {
    expect(Array.isArray(context.response.body)).toBe(true);
  });
};

export const thenTheResponseShouldHaveId = (then: DefineStepFunction, context: Context) => {
  then(/^the response should have an id$/, async () => {
    expect(context.response.body.id).toBeDefined();
  });
};

export const thenTheResponseBodyShouldMatchOrder = (then: DefineStepFunction, context: Context) => {
  then(/^the response body should match order "([^"]*)"$/, async (orderName) => {
    const order = context.data[orderName];
    const responseBody = context.response.body;

    expect(responseBody.id).toBe(order.id);
  });
};
