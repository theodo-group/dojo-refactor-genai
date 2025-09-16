## Règles à respecter
<rules>
<rule>1 endpoint correspond à 1 describe isolé
</rule>
<rule>respecte la structure donnée en structureE2eTestExample
</rule>
<rule>
crée une méthode dans GlobalFixtures spécifique au cas de test qui fait le setup du test
</rule>
<rule>
applique la migration uniquement pour 1 seul endpoint
</rule>
<rule>
un test e2e doit etre séparé en 3 parties :
- Arrange (setup ou GIVEN) du test avec utilisation de fixtures spécifiques au cas de test
- Act (WHEN) qui fait l'appel à la route à tester qui est dans le nom du test
- Assert (THEN) qui a besoin d'une méthode de comparaison du résultat du WHEN
</rule>
<rule>
La partie ACT doit être forcément déclarée au niveau du test
</rule>
<rule>
La partie ASSERT doit être forcément déclarée au niveau du test
</rule>
</rules>

<structureE2eTestExample>
describe("endpoint GET /customer/:customerId ", () => {
let app: INestApplication;
let fixtures: GlobalFixtures;

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    app.setGlobalPrefix("api");
    await app.init();

    // Initialize fixtures
    fixtures = new GlobalFixtures(app);
});

beforeEach(async() => await fixtures.clear());

afterAll(async () => {
await fixtures.clear();
await app.close();
});

it("should return orders for a customer", async () => {
// ARRANGE -> call à une function simple spécifique à la fixture demandée
const customer = await fixtures.createCustomerWithOrdersFixture();

            // ACT
      return request(app.getHttpServer())
        .get(`/api/orders/customer/${customer.id}`)
        .expect(200)
        .expect(
            // ASSERT -> arrow function qui prend en argument (res) et qui fait des calls à plusieurs expect() statements
            (res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((order) => {
            expect(order.customer.id).toBe(customer.id);
          });
        });
    });
});
</structureE2eTestExample>
