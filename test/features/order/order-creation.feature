Feature: Order Creation
  As a restaurant staff member
  I want to create new orders
  So that I can process customer requests

  Background:
    Given the application is running
    And the database is clean

  Scenario: Create a new order with valid data
    Given a customer exists
    And 3 products exist
    When I create an order with the following details:
      | field        | value              |
      | productCount | 2                  |
      | totalAmount  | 30.5               |
      | notes        | Test order notes   |
    Then the response status should be 201
    And the order status should be "pending"
    And the order total amount should be 30.5
    And the order notes should be "Test order notes"
    And the order should have 2 products

  Scenario: Create an order without notes
    Given a customer exists
    And 2 products exist
    When I create an order with the following details:
      | field        | value |
      | productCount | 2     |
      | totalAmount  | 25.0  |
    Then the response status should be 201
    And the order status should be "pending"
    And the order should have 2 products
