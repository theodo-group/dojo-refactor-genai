Feature: Loyalty points management
    As a restaurant manager
    I want to manage customer loyalty points
    So that customers can earn and redeem rewards

    Scenario: OK case - Get customer loyalty points
        Given the customer "PointsCustomer" exists with email "points@example.com"
        When endpoint "/api/loyalty/points/{:PointsCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "points"

    Scenario: OK case - Get loyalty information
        Given the customer "InfoCustomer" exists with email "info@example.com"
        When endpoint "/api/loyalty/info/{:InfoCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "customerId"
        Then the response body should have property "loyaltyPoints"
        Then the response body should have property "currentTier"
        Then the response body should have property "isActive"

    Scenario: OK case - Get loyalty metrics
        Given the customer "MetricsCustomer" exists with email "metrics@example.com"
        When endpoint "/api/loyalty/metrics/{:MetricsCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "totalPointsEarned"
        Then the response body should have property "totalPointsRedeemed"
        Then the response body should have property "currentBalance"
        Then the response body should have property "tierStatus"

    Scenario: OK case - Handle point adjustments
        Given the customer "AdjustCustomer" exists with email "adjust@example.com"
        When endpoint "/api/loyalty/adjust" is called with "POST" method and body
            """
            {
                "customerId": "{:AdjustCustomer.id}",
                "adjustment": 50,
                "reason": "Test bonus"
            }
            """
        Then the response status code should be "201"

    Scenario: KO case - Prevent excessive point adjustments
        Given the customer "ExcessiveCustomer" exists with email "excessive@example.com"
        When endpoint "/api/loyalty/adjust" is called with "POST" method and body
            """
            {
                "customerId": "{:ExcessiveCustomer.id}",
                "adjustment": 999999,
                "reason": "Too many points"
            }
            """
        Then the response status code should be "400"

    Scenario: OK case - Handle loyalty program suspension
        Given the customer "SuspendCustomer" exists with email "suspend@example.com"
        When endpoint "/api/loyalty/suspend" is called with "POST" method and body
            """
            {
                "customerId": "{:SuspendCustomer.id}",
                "reason": "Test suspension"
            }
            """
        Then the response status code should be "201"

    Scenario: OK case - Handle loyalty program reactivation
        Given the customer "ReactivateCustomer" exists with email "reactivate@example.com"
        When endpoint "/api/loyalty/reactivate/{:ReactivateCustomer.id}" is called with "POST" method
        Then the response status code should be "201"

    Scenario: OK case - Handle expired points
        Given the customer "ExpiredCustomer" exists with email "expired@example.com"
        When endpoint "/api/loyalty/expired/{:ExpiredCustomer.id}" is called with "GET" method
        Then the response status code should be "200"
        Then the response body should have property "expiredPoints"

    Scenario: KO case - Validate UUID format for loyalty tier
        When endpoint "/api/loyalty/tier/not-a-uuid" is called with "GET" method
        Then the response status code should be "400"
        Then the response message should contain "Invalid UUID format"

    Scenario: KO case - Return 400 for non-existent customer
        When endpoint "/api/loyalty/info/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" is called with "GET" method
        Then the response status code should be "400"
        Then the response message should contain "Customer not found"
