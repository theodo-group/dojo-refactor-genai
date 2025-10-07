
## Why

This standard outlines the approach for writing and structuring your end-to-end tests using Jest Cucumber in **`healico-server`**. 

**These tests form the backbone of our backend documentation, ensuring that every edge case is thoroughly validated.**

##Control points

- exhaustive context set up
- use context for ids instead of hardcoding them
- check both status and state of system
- check KO edge case
- e2e tests should only use shared steps

![image.png](attachment:0fc85593-b0dd-455a-8ee9-61767a4c77a1:image.png)

## **Mistakes to Avoid**

1. **❌ Not Running Tests After Every Change:**
    
    Tests can be quite sensitive, and even minor modifications may introduce errors. Always run your test suite after any change to catch issues early.
    
2. **❌ Code Duplication:**
    
    Duplicating similar logic in multiple places increases the risk of inconsistencies and maintenance challenges. Reuse helper functions and shared contexts wherever possible to keep your code DRY (Don't Repeat Yourself).
    
3. **❌ Neglecting Cleanup:**
    
    Failing to properly clean up test data can lead to state leakage between tests, resulting in unreliable outcomes.
    

## How Jest Cucumber Works

![image.png](attachment:1f8d14df-0263-4b20-a0e5-46559b1673db:image.png)

### 1. Feature Files in Gherkin

<aside>
💡

Gherkin is a domain-specific language used to write test scenarios in a clear, human-readable format. 
Gherkin uses a set of special [keywords](https://cucumber.io/docs/gherkin/reference#keywords) to give structure and meaning to executable specifications. Each keyword is translated to many spoken languages;

Most lines in a Gherkin document start with one of the [keywords](https://cucumber.io/docs/gherkin/reference#keywords).
This structured approach is a core component of Behavior-Driven Development (BDD) frameworks like Cucumber.

</aside>

- **Purpose:**
    
    Feature files describe the behavior of your application in plain language. They include scenarios with steps such as **Given**, **When**, and **Then**. This makes them accessible to both technical and non-technical team members.
    
- **Structure:**
    
    A typical feature file includes a ***Feature*** section and one or more ***Scenario*** sections. Each scenario outlines the initial conditions, actions, and expected outcomes.
    
- **Example:**
    
    ```gherkin
    Feature: Delete unread events
        Scenario: OK case - Delete all events except comments for the user
            Given the patient "MarcPatient" exists
            Given the account "TomAccount" exists
            Given the account "TomAccount" is logged in
            Given the account "TomAccount" has a user "TomUser"
            Given there is a signed consent "TomMarcConsent" between the user "TomUser" and the patient "MarcPatient" authored by the user "TomUser"
    	    Given there is an unread event "TomWoundEventUnreadEvent" for the user "TomUser" and the patient "MarcPatient" with type "WoundEvent"
            Given there is an unread event "TomWoundCommentUnreadEvent" for the user "TomUser" and the patient "MarcPatient" with type "WoundComment"
            Given there is an unread event "TomBwUnreadEvent" for the user "TomUser" and the patient "MarcPatient" with type "BeyondWoundMessage"
            Given there is an unread event "TomBwCommentUnreadEvent" for the user "TomUser" and the patient "MarcPatient" with type "BeyondWoundComment"
            When endpoint "/v1/users/{:TomUser.id}/patients/{:MarcPatient.id}/~deleteUnreadEvents" is called with "DELETE" method and body
                """
                {
                    "type": "All",
                    "relatedId": null
                }
                """
            Then the response status code should be "200"
            Then 2 unread events exist for user "TomUser"
            Then one unread event "WoundComment" exists for user "TomUser" and patient "MarcPatient"
            Then one unread event "BeyondWoundComment" exists for user "TomUser" and patient "MarcPatient"
    ```
    
    In this example, each step describes a part of the test scenario in a clear, sequential manner.
    

### 2. Step Definitions

- **Purpose:**
    
    Step definitions bridge the gap between the plain language in your feature files and the actual test code. They contain the logic for what happens when a step is executed.
    
- **Mapping Steps to Code:**
    
    Using jest-cucumber, you map each Gherkin step to a JavaScript function. This is typically done with methods like `given`, `when`, and `then` provided by jest-cucumber.
    
- **Example:**
    
    ```jsx
    const feature = loadFeature('e2e/api-gateway/features/unreadEvents/deleteUnreadEvents.feature');
    
    defineFeature(feature, (test) => {
      const context = new Context();
    
      beforeAll(async () => {
        await context.createAndStartApp();
      });
    
      test('OK case - Delete all events except comments for the user', ({ given, when, then }) => {
        // Given
        givenThePatientExists(given, context);
        givenTheAccountExists(given, context);
        givenTheAccountIsLoggedIn(given, context);
        givenTheAcccountHasAUser(given, context);
        givenThereIsASignedConsentBetweenTheUserAndPatientAuthoredBy(given, context);
        givenADefaultUnreadEventWasCreated(given, context);
        givenADefaultUnreadEventWasCreated(given, context);
        givenADefaultUnreadEventWasCreated(given, context);
        givenADefaultUnreadEventWasCreated(given, context);
        // When
        whenApiIsCalledWithBody(when, context);
        // Then
        thenResponseStatusCode(then, context);
        thenNumberOfUnreadEventExistsForUser(then, context);
      });
      
        afterEach(async () => {
        context.cleanContextualData();
        await cleanAllTables(context);
      });
    
      afterAll(async () => {
        await context.cleanAndStopApp();
      });
     });
    ```
    
    In this snippet, the regular expression `/^the patient "([^"]*)" exists$/` matches the corresponding Gherkin step. When that step appears in the feature file, the associated function is executed:
    
    ```tsx
    
    import { DefineStepFunction } from 'jest-cucumber';
    import { Context } from '../../../context';
    
    export const givenThePatientExists = (given: DefineStepFunction, context: Context) => {
      given(/^the patient "([^"]*)" exists$/, async (patientName) => {
        const insertedPatients = await context.ormConnection.query(
          'INSERT INTO patients (firstname, lastname, birthdate) VALUES ($1, $2, $3) RETURNING *',
          [patientName, `${patientName}Lastname`, '1991-01-04T23:00:00.000Z'],
        );
        context.data[patientName] = insertedPatients[0];
      });
    };
    
    ```
    

## Documentation

- [cucumber](https://cucumber.io/docs/)
