Feature: Order Retrieval
  As a restaurant staff member
  I want to retrieve order information
  So that I can view and manage customer orders

  Background:
    Given the application is running
    And the database is clean

  Scenario: Retrieve all orders
    Given a customer exists
    And 3 products exist
    And the customer has 2 orders with these products
    When I request all orders
    Then the response status should be 200
    And the response should contain 2 orders
    And each order should have customer information
    And each order should have product information

  Scenario: Filter orders by pending status
    Given a customer exists
    And 2 products exist
    And the customer has an order with status "pending"
    And the customer has an order with status "delivered"
    When I request orders with status "pending"
    Then the response status should be 200
    And all returned orders should have status "pending"

  Scenario: Retrieve a specific order by ID
    Given a customer exists
    And 2 products exist
    And the customer has an order with these products
    When I request the order by its ID
    Then the response status should be 200
    And the response should contain the order details
    And the order should have customer information
    And the order should have product information

  Scenario: Retrieve orders for a specific customer
    Given 2 customers exist
    And 2 products exist
    And customer 1 has 2 orders
    And customer 2 has 1 order
    When I request orders for customer 1
    Then the response status should be 200
    And the response should contain 2 orders
    And all returned orders should belong to customer 1
