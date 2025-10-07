Feature: Order validation
    As a system administrator
    I want to validate order data
    So that only valid orders are created

    Scenario: KO case - Validate total amount matches product prices
        Given the customer "ValidationCustomer" exists with email "validation@example.com"
        Given the product "ValidationProduct1" exists with price "12.99" and category "pizza"
        Given the product "ValidationProduct2" exists with price "14.99" and category "pizza"
        When endpoint "/api/orders" is called with "POST" method and body
            """
            {
                "customerId": "{:ValidationCustomer.id}",
                "productIds": ["{:ValidationProduct1.id}", "{:ValidationProduct2.id}"],
                "totalAmount": 50.00,
                "notes": "Invalid total test"
            }
            """
        Then the response status code should be "400"
        Then the response message should contain "does not match product prices"

    Scenario: KO case - Validate product availability
        Given the customer "AvailabilityCustomer" exists with email "availability@example.com"
        Given the unavailable product "UnavailableProduct" exists
        When endpoint "/api/orders" is called with "POST" method and body
            """
            {
                "customerId": "{:AvailabilityCustomer.id}",
                "productIds": ["{:UnavailableProduct.id}"],
                "totalAmount": 15.99,
                "notes": "Order with unavailable product"
            }
            """
        Then the response status code should be "400"
        Then the response message should contain "not available"

    Scenario: KO case - Prevent updating delivered orders
        Given the customer "UpdateCustomer" exists with email "update@example.com"
        Given the product "UpdateProduct" exists with price "10.99" and category "test"
        Given the order "DeliveredOrderUpdate" exists for customer "UpdateCustomer" with product "UpdateProduct" and status "delivered"
        When endpoint "/api/orders/{:DeliveredOrderUpdate.id}" is called with "PATCH" method and body
            """
            {
                "notes": "Trying to modify delivered order",
                "totalAmount": 99.99
            }
            """
        Then the response status code should be "400"
        Then the response message should contain "Cannot update order that is already delivered"

    Scenario: KO case - Cannot cancel delivered order
        Given the customer "CancelDeliveredCustomer" exists with email "canceldelivered@example.com"
        Given the product "CancelDeliveredProduct" exists with price "10.99" and category "test"
        Given the order "DeliveredOrderCancel" exists for customer "CancelDeliveredCustomer" with product "CancelDeliveredProduct" and status "delivered"
        When endpoint "/api/orders/{:DeliveredOrderCancel.id}" is called with "DELETE" method
        Then the response status code should be "400"
        Then the response message should contain "Cannot cancel"
