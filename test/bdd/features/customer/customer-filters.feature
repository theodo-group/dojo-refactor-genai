Feature: Customer filtering and search
    As a restaurant manager
    I want to filter and search customers
    So that I can find specific customer information

    Scenario: OK case - Paginate customer results
        Given the customer "Customer1" exists with email "cust1@example.com"
        Given the customer "Customer2" exists with email "cust2@example.com"
        Given the customer "Customer3" exists with email "cust3@example.com"
        When endpoint "/api/customers" is called with "GET" method and query "limit=2&offset=0"
        Then the response status code should be "200"

    Scenario: OK case - Filter customers by active status
        Given the customer "ActiveCustomer" exists with email "active@example.com"
        When endpoint "/api/customers" is called with "GET" method and query "active=true"
        Then the response status code should be "200"
        Then the response body should be an array with at least "1" items

    Scenario: OK case - Search customers by name
        Given the customer "john" exists with email "john1@example.com"
        Given the customer "jane" exists with email "jane1@example.com"
        When endpoint "/api/customers" is called with "GET" method and query "search=john"
        Then the response status code should be "200"
        Then the response body should contain customer with name "john"
