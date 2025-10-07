Feature: Order CRUD operations
    As a restaurant manager
    I want to manage orders in the system
    So that I can track customer orders

    Scenario: OK case - Get all orders
        Given the customer "OrderCustomer" exists with email "order@example.com"
        Given the product "Pizza" exists with price "12.99" and category "pizza"
        Given the order "TestOrder" exists for customer "OrderCustomer" with product "Pizza" and total "12.99"
        When endpoint "/api/orders" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should be an array with at least "1" items

    Scenario: OK case - Get order by ID
        Given the customer "Customer1" exists with email "cust1@example.com"
        Given the product "TestProduct" exists with price "10.99" and category "test"
        Given the order "Order1" exists for customer "Customer1" with product "TestProduct" and total "10.99"
        When endpoint "/api/orders/{:Order1.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "id"
        Then the response body property "status" should equal "pending"

    Scenario: OK case - Get orders for a customer
        Given the customer "OrderCustomer2" exists with email "order2@example.com"
        Given the product "Pizza2" exists with price "12.99" and category "pizza"
        Given the order "CustomerOrder" exists for customer "OrderCustomer2" with product "Pizza2" and total "12.99"
        When endpoint "/api/orders/customer/{:OrderCustomer2.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should be an array with at least "1" items

    Scenario: OK case - Filter orders by status
        Given the customer "StatusCustomer" exists with email "status@example.com"
        Given the product "StatusProduct" exists with price "15.99" and category "test"
        Given the order "PendingOrder" exists for customer "StatusCustomer" with product "StatusProduct" and status "pending"
        When endpoint "/api/orders" is called with "GET" method and query "status=pending"
        Then the response status code should be "200"
        Then the response body should be an array with at least "1" items

    Scenario: OK case - Create a new order
        Given the customer "NewOrderCustomer" exists with email "neworder@example.com"
        Given the product "OrderProduct" exists with price "12.99" and category "pizza"
        When endpoint "/api/orders" is called with "POST" method and body
            """
            {
                "customerId": "{:NewOrderCustomer.id}",
                "productIds": ["{:OrderProduct.id}"],
                "totalAmount": 12.99,
                "notes": "Test order notes"
            }
            """
        Then the response status code should be "201"
        Then the response body property "status" should equal "pending"
        Then the response body should have property "notes" with value "Test order notes"

    Scenario: OK case - Update order status
        Given the customer "StatusUpdateCustomer" exists with email "statusupdate@example.com"
        Given the product "StatusUpdateProduct" exists with price "10.99" and category "test"
        Given the order "UpdateOrder" exists for customer "StatusUpdateCustomer" with product "StatusUpdateProduct" and status "preparing"
        When endpoint "/api/orders/{:UpdateOrder.id}/status" is called with "PATCH" method and body
            """
            {
                "status": "ready"
            }
            """
        Then the response status code should be "200"
        Then the response body property "status" should equal "ready"

    Scenario: KO case - Prevent invalid status transitions
        Given the customer "InvalidStatusCustomer" exists with email "invalidstatus@example.com"
        Given the product "InvalidStatusProduct" exists with price "10.99" and category "test"
        Given the order "DeliveredOrder" exists for customer "InvalidStatusCustomer" with product "InvalidStatusProduct" and status "delivered"
        When endpoint "/api/orders/{:DeliveredOrder.id}/status" is called with "PATCH" method and body
            """
            {
                "status": "preparing"
            }
            """
        Then the response status code should be "400"

    Scenario: OK case - Cancel an order
        Given the customer "CancelCustomer" exists with email "cancel@example.com"
        Given the product "CancelProduct" exists with price "10.99" and category "test"
        Given the order "CancelOrder" exists for customer "CancelCustomer" with product "CancelProduct" and status "pending"
        When endpoint "/api/orders/{:CancelOrder.id}" is called with "DELETE" method
        Then the response status code should be "204"
        When endpoint "/api/orders/{:CancelOrder.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body property "status" should equal "cancelled"
