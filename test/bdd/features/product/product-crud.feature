Feature: Product CRUD operations
    As a restaurant manager
    I want to manage products in the system
    So that I can maintain the menu

    Scenario: OK case - Get all available products
        Given the product "MargheritaPizza" exists with price "12.99" and category "pizza"
        Given the product "CaesarSalad" exists with price "8.99" and category "salad"
        Given the product "Tiramisu" exists with price "7.99" and category "dessert"
        When endpoint "/api/products" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should be an array with at least "3" items
        Then the response body should contain product with name "MargheritaPizza"
        Then the response body should contain product with name "CaesarSalad"

    Scenario: OK case - Get product by ID
        Given the product "PepperoniPizza" exists with price "14.99" and category "pizza"
        When endpoint "/api/products/{:PepperoniPizza.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "name" with value "PepperoniPizza"
        Then the response body property "price" should equal "14.99"

    Scenario: KO case - Get non-existent product returns 404
        When endpoint "/api/products/00000000-0000-0000-0000-000000000000" is called with "GET" method
        Then the response status code should be "404"

    Scenario: OK case - Create a new product
        When endpoint "/api/products" is called with "POST" method and body
            """
            {
                "name": "Test Product",
                "description": "This is a test product",
                "price": 9.99,
                "category": "test"
            }
            """
        Then the response status code should be "201"
        Then the response body should have property "name" with value "Test Product"
        Then the response body should have property "id"
        Then store the response body as "CreatedProduct"

    Scenario: OK case - Update a product
        Given the product "UpdateTestProduct" exists with price "12.99" and category "pizza"
        When endpoint "/api/products/{:UpdateTestProduct.id}" is called with "PATCH" method and body
            """
            {
                "name": "Updated Product Name",
                "price": 19.99
            }
            """
        Then the response status code should be "200"
        Then the response body should have property "name" with value "Updated Product Name"
        Then the response body property "price" should equal "19.99"

    Scenario: OK case - Delete a product (soft delete)
        Given the product "DeleteTestProduct" exists with price "10.99" and category "test"
        When endpoint "/api/products/{:DeleteTestProduct.id}" is called with "DELETE" method
        Then the response status code should be "204"
        When endpoint "/api/products" is called with "GET" method
        Then the response body should not contain product with name "DeleteTestProduct"

    Scenario: KO case - Delete product in active order should fail
        Given the customer "TestCustomer" exists
        Given the product "ProductInOrder" exists with price "15.99" and category "pizza"
        Given the order "ActiveOrder" exists for customer "TestCustomer" with product "ProductInOrder" and status "preparing"
        When endpoint "/api/products/{:ProductInOrder.id}" is called with "DELETE" method
        Then the response status code should be "409"
        Then the response message should contain "active orders"

    Scenario: OK case - Partial update of product
        Given the product "PartialUpdateProduct" exists with price "12.99" and category "original-category"
        When endpoint "/api/products/{:PartialUpdateProduct.id}" is called with "PATCH" method and body
            """
            {
                "description": "Updated description only"
            }
            """
        Then the response status code should be "200"
        Then the response body should have property "description" with value "Updated description only"
        Then the response body should have property "name" with value "PartialUpdateProduct"
        Then the response body should have property "category" with value "original-category"
