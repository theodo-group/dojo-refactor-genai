Feature: Application health and basic tests
    As a system administrator
    I want to verify the application is running correctly
    So that I can monitor system health

    Scenario: KO case - Root path returns 404
        When endpoint "/" is called with "GET" method
        Then the response status code should be "404"

    Scenario: KO case - API root returns 404
        When endpoint "/api" is called with "GET" method
        Then the response status code should be "404"

    Scenario: KO case - Handle empty request bodies appropriately
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {}
            """
        Then the response status code should be "400"

    Scenario: OK case - Handle special characters with valid length
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "Test Customer Name",
                "email": "verylongemail@example.com",
                "phone": "111-222-3333",
                "address": "123 Main Street"
            }
            """
        Then the response status code should be "201"

    Scenario: KO case - Return error for unsupported HTTP methods
        When endpoint "/api/customers" is called with "PATCH" method
        Then the response status code should be "404"

    Scenario: KO case - Handle malformed UUIDs in path parameters
        When endpoint "/api/customers/invalid-uuid-format" is called with "GET" method
        Then the response status code should be "400"

    Scenario: OK case - Handle special characters in request data
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
