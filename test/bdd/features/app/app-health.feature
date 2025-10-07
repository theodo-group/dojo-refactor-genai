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

    Scenario: KO case - Handle invalid JSON gracefully
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {"invalid": json}
            """
        Then the response status code should be "400"

    Scenario: OK case - Handle large request bodies within limits
        When endpoint "/api/customers" is called with "POST" method and body
            """
            {
                "name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "email": "verylongemail@example.com",
                "phone": "11111111111111111111",
                "address": "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
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
