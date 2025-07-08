# Testing standard

## Testing strategy

<rule>
When testing a service, we target a 100% test coverage : test each method and each branches.
</rule>

<rule>
When testing a method, test the nominal case with a coherent dataset.
</rule>

<rule>
Separate nominal case from expected exceptions : expected edge-cases should have their dedicated tests.
</rule>

## Mocks

<rule>
Mocks that are repeatedly needed should be instanciated in a beforeEach method, and potentially overriden after being reseted with mockReset, when needed in a test.
</rule>

## Tests objects instanciation

<rule>
Objects and Data Transfer Objects that are repeatedly instanciated should use a dedicated builder pattern, in specific files.
</rule>

<rule>
Each entity should have its builder in a dedicated file
</rule>

<rule>
When running multiple tests with the same intention on different inputs, use the `.each` method with a data provider that covers the different cases.
</rule>

## Equality checks

<rule>
When comparing floating point equality, use `expect(...).toBeCloseTo()` instead of `toEqual`.
</rule>
