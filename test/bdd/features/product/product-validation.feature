Feature: Product validation
    As a system administrator
    I want to validate product data
    So that only valid products are stored in the system

    Scenario: KO case - Reject product with negative price
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Invalid Price Product",
                "description": "This product has invalid price",
                "price": -5.99,
                "category": "test"
            }
            """
        Then the response status code should be "400"
        Then the response message should contain "price must not be less than 0"

    Scenario: KO case - Reject product with zero price
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Free Product",
                "description": "This product is free",
                "price": 0,
                "category": "free"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Reject product with missing name
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "description": "Missing name",
                "price": 10.99,
                "category": "test"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Reject product with missing price
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Test Product",
                "category": "test"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Reject product with missing category
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Test Product",
                "price": 10.99
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Reject price with too many decimal places
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Precision Test Product",
                "description": "Testing price precision",
                "price": 12.999,
                "category": "test"
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Validate price update - negative value
        Given the product "UpdatePriceTest" exists with price "15.99" and category "test"
        When endpoint "/api/products/{:UpdatePriceTest.id}" is called with "PATCH" method and body
            """
            {
                "price": -10
            }
            """
        Then the response status code should be "400"

    Scenario: KO case - Validate price update - zero value
        Given the product "UpdatePriceZeroTest" exists with price "15.99" and category "test"
        When endpoint "/api/products/{:UpdatePriceZeroTest.id}" is called with "PATCH" method and body
            """
            {
                "price": 0
            }
            """
        Then the response status code should be "400"

    Scenario: OK case - Accept product with special characters in name
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Spicy Jalapeño & Cheese Nacho's",
                "description": "Product with special characters: åäö, éèê, ñ",
                "price": 15.99,
                "category": "snacks"
            }
            """
        Then the response status code should be "201"
        Then the response body should have property "name" with value "Spicy Jalapeño & Cheese Nacho's"
