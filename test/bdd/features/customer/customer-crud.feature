Feature: Customer CRUD operations
    As a restaurant manager
    I want to manage customers in the system
    So that I can track customer information

    Scenario: OK case - Get all active customers
        Given the customer "JohnDoe" exists with email "john@example.com"
        Given the customer "JaneSmith" exists with email "jane@example.com"
        Given the customer "BobJohnson" exists with email "bob@example.com"
        When endpoint "/api/customers" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should be an array with at least "3" items
        Then the response body should contain customer with email "john@example.com"
        Then the response body should contain customer with email "jane@example.com"

    Scenario: OK case - Get customer by ID
        Given the customer "TestCustomer" exists with email "test@example.com"
        When endpoint "/api/customers/{:TestCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "name" with value "TestCustomer"
        Then the response body should have property "email" with value "test@example.com"

    Scenario: KO case - Get non-existent customer returns 404
        When endpoint "/api/customers/00000000-0000-0000-0000-000000000000" is called with "GET" method
        Then the response status code should be "404"

    Scenario: OK case - Create a new customer
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "Test Customer",
                "email": "test@example.com",
                "phone": "111-222-3333",
                "address": "321 Test St"
            }
            """
        Then the response status code should be "201"
        Then the response body should have property "name" with value "Test Customer"
        Then the response body should have property "email" with value "test@example.com"
        Then the response body should have property "isActive" with value "true"

    Scenario: OK case - Update a customer
        Given the customer "UpdateTest" exists with email "update@example.com"
        When endpoint "/api/customers/{:UpdateTest.id}" is called with "PATCH" method and body
            """
            {
                "name": "Updated Name",
                "phone": "updated-phone"
            }
            """
        Then the response status code should be "200"
        Then the response body should have property "name" with value "Updated Name"
        Then the response body should have property "phone" with value "updated-phone"
        Then the response body should have property "email" with value "update@example.com"

    Scenario: OK case - Soft delete a customer
        Given the customer "DeleteTest" exists with email "delete@example.com"
        When endpoint "/api/customers/{:DeleteTest.id}" is called with "DELETE" method
        Then the response status code should be "204"
        When endpoint "/api/customers" is called with "GET" method
        Then the response body should not contain customer with email "delete@example.com"

    Scenario: OK case - Partial update of customer
        Given the customer "PartialUpdate" exists with email "partial@example.com"
        When endpoint "/api/customers/{:PartialUpdate.id}" is called with "PATCH" method and body
            """
            {
                "phone": "updated-phone-only"
            }
            """
        Then the response status code should be "200"
        Then the response body should have property "phone" with value "updated-phone-only"
        Then the response body should have property "name" with value "PartialUpdate"
        Then the response body should have property "email" with value "partial@example.com"

    Scenario: OK case - Get customers with order history
        Given the customer "CustomerWithOrders" exists with email "withorders@example.com"
        Given the product "TestPizza" exists with price "12.99" and category "pizza"
        Given the order "Order1" exists for customer "CustomerWithOrders" with product "TestPizza" and total "12.99"
        When endpoint "/api/customers" is called with "GET" method and query "include_orders=true"
        Then the response status code should be "200"
        Then the response body should be an array with at least "1" items
