# Plan de migration du premier test e2e OrderController

## Objectif
Migrer le test `GET /api/orders` pour qu’il respecte les standards de structure et d’utilisation des fixtures spécifiques.

---

## Étapes

### 1. Préparation de la structure du test

- Créer un nouveau fichier de test ou une nouvelle section `describe` dédiée à l’endpoint `GET /api/orders`.
- Respecter la structure : 1 endpoint = 1 describe isolé.

### 2. Refactorisation du setup

- Utiliser le pattern `beforeAll` pour initialiser l’application et les fixtures.
- Utiliser `beforeEach` pour nettoyer les données avant chaque test via `fixtures.clear()`.
- Utiliser `afterAll` pour fermer l’application et nettoyer les données.

### 3. Création d’une méthode de fixture spécifique

- Dans `GlobalFixtures`, ajouter une méthode dédiée, par exemple `createOrdersListFixture()`, qui prépare les données nécessaires pour ce test précis (ex : plusieurs commandes avec clients et produits associés).
- Cette méthode doit être appelée dans la partie Arrange du test.

### 4. Réécriture du test

- Séparer le test en 3 parties :
    - **Arrange** : appel à la méthode de fixture spécifique.
    - **Act** : appel à la route `/api/orders`.
    - **Assert** : fonction de comparaison du résultat, avec plusieurs `expect()` pour vérifier la structure et le contenu.

### 5. Comparaison du résultat

- Créer une fonction d’assertion dédiée si besoin, pour comparer la liste des commandes retournées avec celles créées dans la fixture.

### 6. Vérification du respect des règles

- Vérifier que la structure du test correspond à l’exemple fourni dans `<structureE2eTestExample>`.
- S’assurer que la migration ne concerne que ce test/endpoint.

---

## Exemple de structure attendue

```typescript
describe("endpoint GET /orders", () => {
  let app: INestApplication;
  let fixtures: GlobalFixtures;

  beforeAll(async () => {
    // ...initialisation app et fixtures
  });

  beforeEach(async () => await fixtures.clear());

  afterAll(async () => {
    await fixtures.clear();
    await app.close();
  });

  it("should return all orders", async () => {
    // ARRANGE
    const orders = await fixtures.createOrdersListFixture();

    // ACT
    return request(app.getHttpServer())
      .get("/api/orders")
      .expect(200)
      .expect((res) => {
        // ASSERT
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(orders.length);
        // ...autres vérifications
      });
  });
});
