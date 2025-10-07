Feature: Product filtering and sorting
    As a restaurant customer
    I want to filter and sort products
    So that I can find what I'm looking for

    Scenario: OK case - Filter products by category
        Given the product "MargheritaPizza" exists with price "12.99" and category "pizza"
        Given the product "PepperoniPizza" exists with price "14.99" and category "pizza"
        Given the product "CaesarSalad" exists with price "8.99" and category "salad"
        When endpoint "/api/products" is called with "GET" method and query "category=pizza"
        Then the response status code should be "200"
        Then the response body should be an array with length "2"
        Then the response body should contain product with name "MargheritaPizza"
        Then the response body should contain product with name "PepperoniPizza"

    Scenario: OK case - Filter by non-existent category returns empty array
        Given the product "SomePizza" exists with price "12.99" and category "pizza"
        When endpoint "/api/products" is called with "GET" method and query "category=nonexistent"
        Then the response status code should be "200"
        Then the response body should be an array with length "0"

    Scenario: OK case - Filter unavailable products
        Given the product "AvailableProduct" exists with price "10.99" and category "pizza"
        Given the unavailable product "OutOfStock" exists
        When endpoint "/api/products" is called with "GET" method and query "available=false"
        Then the response status code should be "200"
        Then the response body should contain product with name "OutOfStock"

    Scenario: OK case - Sort products by price ascending
        Given the product "CheapProduct" exists with price "5.99" and category "test"
        Given the product "MediumProduct" exists with price "10.99" and category "test"
        Given the product "ExpensiveProduct" exists with price "20.99" and category "test"
        When endpoint "/api/products" is called with "GET" method and query "sort=price_asc"
        Then the response status code should be "200"
        Then the response body should be an array with at least "3" items

    Scenario: OK case - Sort products by price descending
        Given the product "CheapItem" exists with price "5.99" and category "test"
        Given the product "MediumItem" exists with price "10.99" and category "test"
        Given the product "ExpensiveItem" exists with price "20.99" and category "test"
        When endpoint "/api/products" is called with "GET" method and query "sort=price_desc"
        Then the response status code should be "200"
        Then the response body should be an array with at least "3" items

    Scenario: OK case - Filter by price range
        Given the product "Item1" exists with price "9.99" and category "test"
        Given the product "Item2" exists with price "12.99" and category "test"
        Given the product "Item3" exists with price "15.99" and category "test"
        Given the product "Item4" exists with price "18.99" and category "test"
        When endpoint "/api/products" is called with "GET" method and query "price_min=10&price_max=15"
        Then the response status code should be "200"
        Then the response body should be an array with at least "1" items

    Scenario: OK case - Search products by name
        Given the product "Margherita Pizza" exists with price "12.99" and category "pizza"
        Given the product "Pepperoni Pizza" exists with price "14.99" and category "pizza"
        Given the product "Caesar Salad" exists with price "8.99" and category "salad"
        When endpoint "/api/products" is called with "GET" method and query "search=pizza"
        Then the response status code should be "200"
        Then the response body should contain product with name "Margherita Pizza"
        Then the response body should contain product with name "Pepperoni Pizza"

    Scenario: OK case - Paginate results
        Given the product "Product1" exists with price "10.99" and category "test"
        Given the product "Product2" exists with price "11.99" and category "test"
        Given the product "Product3" exists with price "12.99" and category "test"
        Given the product "Product4" exists with price "13.99" and category "test"
        When endpoint "/api/products" is called with "GET" method and query "limit=2&offset=1"
        Then the response status code should be "200"

    Scenario: OK case - Update product availability
        Given the product "AvailabilityTest" exists with price "12.99" and category "pizza"
        When endpoint "/api/products/{:AvailabilityTest.id}" is called with "PATCH" method and body
            """
            {
                "isAvailable": false
            }
            """
        Then the response status code should be "200"
        Then the response body should have property "isAvailable" with value "false"
        When endpoint "/api/products" is called with "GET" method
        Then the response body should not contain product with name "AvailabilityTest"

    Scenario: KO case - Soft-deleted product returns 404
        Given the product "ToBeDeleted" exists with price "10.99" and category "test"
        When endpoint "/api/products/{:ToBeDeleted.id}" is called with "DELETE" method
        Then the response status code should be "204"
        When endpoint "/api/products/{:ToBeDeleted.id}" is called with "GET" method
        Then the response status code should be "404"
