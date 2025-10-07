Feature: Loyalty program discounts
    As a restaurant customer
    I want to receive discounts based on my loyalty
    So that I am rewarded for frequent orders

    Scenario: OK case - Apply 5% discount for 4th order
        Given the customer "LoyaltyCustomer1" exists with email "loyalty1@example.com"
        Given the product "LoyaltyProduct1" exists with price "10.00" and category "test"
        Given the order "LOrder1" exists for customer "LoyaltyCustomer1" with product "LoyaltyProduct1" and status "delivered"
        Given the order "LOrder2" exists for customer "LoyaltyCustomer1" with product "LoyaltyProduct1" and status "delivered"
        Given the order "LOrder3" exists for customer "LoyaltyCustomer1" with product "LoyaltyProduct1" and status "delivered"
        When endpoint "/api/loyalty/calculate/{:LoyaltyCustomer1.id}/100" is called with "GET" method
        Then the response status code should be "200"

    Scenario: OK case - Get customer loyalty tier
        Given the customer "TierCustomer" exists with email "tier@example.com"
        Given the product "TierProduct" exists with price "50.00" and category "test"
        Given the order "TierOrder1" exists for customer "TierCustomer" with product "TierProduct" and status "delivered"
        When endpoint "/api/loyalty/tier/{:TierCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "orderCount"
        Then the response body should have property "totalSpent"
        Then the response body should have property "currentTier"
        Then the response body should have property "discountRate"

    Scenario: OK case - Get customer loyalty statistics
        Given the customer "StatsCustomer" exists with email "stats@example.com"
        Given the product "StatsProduct" exists with price "25.00" and category "test"
        Given the order "StatsOrder" exists for customer "StatsCustomer" with product "StatsProduct" and status "delivered"
        When endpoint "/api/loyalty/stats/{:StatsCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "totalOrders"
        Then the response body should have property "totalSpent"
        Then the response body should have property "currentTier"
        Then the response body should have property "averageOrderValue"

    Scenario: OK case - Calculate next order with discount
        Given the customer "CalcCustomer" exists with email "calc@example.com"
        When endpoint "/api/loyalty/calculate/{:CalcCustomer.id}/100.00" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "discountedAmount"
