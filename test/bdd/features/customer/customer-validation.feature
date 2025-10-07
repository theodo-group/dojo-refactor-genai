Feature: Customer validation
    As a system administrator
    I want to validate customer data
    So that only valid customers are stored in the system

    Scenario: KO case - Reject duplicate email addresses
        Given the customer "ExistingCustomer" exists with email "existing@example.com"
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "Duplicate Test",
                "email": "existing@example.com",
                "phone": "999-999-9999",
                "address": "999 Test St"
            }
            """
        Then the response status code should be "409"
        Then the response message should contain "already exists"

    Scenario: KO case - Validate required fields - missing name
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "email": "test@example.com"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Validate required fields - missing email
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "Test User"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Validate email format - invalid email
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "Test User",
                "email": "notanemail",
                "phone": "123-456-7890"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Prevent email updates to existing emails
        Given the customer "Customer1" exists with email "customer1@example.com"
        Given the customer "Customer2" exists with email "customer2@example.com"
        When endpoint "/api/customers/{:Customer1.id}" is called with "PATCH" method and body
            """
            {
                "email": "customer2@example.com"
            }
            """
        Then the response status code should be "409"
        Then the response message should contain "already exists"

    Scenario: OK case - Handle special characters in customer data
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "José María Çağlar-Schmidt",
                "email": "test.email+tag@example.co.uk",
                "phone": "+1-(555)-123-4567",
                "address": "123 Main St., Apt. #4B, \"Special\" Building"
            }
            """
        Then the response status code should be "201"
        Then the response body should have property "name" with value "José María Çağlar-Schmidt"
        Then the response body should have property "email" with value "test.email+tag@example.co.uk"
