greg-ab: Tout mes tests E2E utilisent un même fichier de fixtures global-fixtures.ts dont j'aimerais me débarrasser pour découpler mes tests E2E. Que recommandes-tu ?

GitHub Copilot: Je vois le problème avec votre configuration actuelle. Le fichier global-fixtures.ts crée un couplage fort entre vos tests E2E, ce qui peut causer des effets de bord comme celui visible dans votre test loyalty où vous modifiez directement les fixtures.

Voici mes recommandations pour découpler vos tests E2E :

## 1. Créer des fixtures spécifiques par domaine

Créez des fixtures dédiées à chaque domaine métier :

```typescript
import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class OrderFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async createTestScenario(): Promise<{
    customers: Customer[];
    products: Product[];
    orders: Order[];
  }> {
    // Create minimal data needed for order tests
    const customers = await this.createCustomers();
    const products = await this.createProducts();
    const orders = await this.createOrders(customers, products);

    return { customers, products, orders };
  }

  async cleanup(): Promise<void> {
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
  }

  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: "Order Test Customer",
        email: "order.test@example.com",
        phone: "123-456-7890",
        address: "123 Test St",
      }),
    ];
    return await this.customerRepository.save(customers);
  }

  private async createProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: "Test Pizza",
        description: "Test pizza for order tests",
        price: 12.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Test Salad",
        description: "Test salad for order tests",
        price: 8.99,
        category: "salad",
      }),
    ];
    return await this.productRepository.save(products);
  }

  private async createOrders(
    customers: Customer[],
    products: Product[]
  ): Promise<Order[]> {
    const orders = [
      this.orderRepository.create({
        customer: customers[0],
        products: [products[0]],
        totalAmount: 12.99,
        status: OrderStatus.PENDING,
        notes: "Test order",
      }),
      this.orderRepository.create({
        customer: customers[0],
        products: [products[1]],
        totalAmount: 8.99,
        status: OrderStatus.READY,
        notes: "Test ready order",
      }),
    ];
    return await this.orderRepository.save(orders);
  }
}
```

```typescript
import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../src/entities/customer.entity";
import { Product } from "../../src/entities/product.entity";
import { Order, OrderStatus } from "../../src/entities/order.entity";

export class LoyaltyFixtures {
  private app: INestApplication;
  private customerRepository: Repository<Customer>;
  private productRepository: Repository<Product>;
  private orderRepository: Repository<Order>;

  constructor(app: INestApplication) {
    this.app = app;
    this.customerRepository = app.get(getRepositoryToken(Customer));
    this.productRepository = app.get(getRepositoryToken(Product));
    this.orderRepository = app.get(getRepositoryToken(Order));
  }

  async createLoyaltyTestScenario(): Promise<{
    loyalCustomer: Customer;
    regularCustomer: Customer;
    products: Product[];
  }> {
    const customers = await this.createCustomers();
    const products = await this.createProducts();

    // Create order history for loyal customer (more than 3 orders)
    await this.createOrderHistory(customers[0], products);

    return {
      loyalCustomer: customers[0],
      regularCustomer: customers[1],
      products,
    };
  }

  async cleanup(): Promise<void> {
    await this.orderRepository.query("TRUNCATE TABLE order_products CASCADE");
    await this.orderRepository.query("TRUNCATE TABLE orders CASCADE");
    await this.productRepository.query("TRUNCATE TABLE products CASCADE");
    await this.customerRepository.query("TRUNCATE TABLE customers CASCADE");
  }

  private async createCustomers(): Promise<Customer[]> {
    const customers = [
      this.customerRepository.create({
        name: "Loyal Customer",
        email: "loyal@example.com",
        phone: "123-456-7890",
        address: "123 Loyalty St",
      }),
      this.customerRepository.create({
        name: "Regular Customer",
        email: "regular@example.com",
        phone: "987-654-3210",
        address: "456 Regular Ave",
      }),
    ];
    return await this.customerRepository.save(customers);
  }

  private async createProducts(): Promise<Product[]> {
    const products = [
      this.productRepository.create({
        name: "Loyalty Pizza",
        description: "Pizza for loyalty tests",
        price: 15.99,
        category: "pizza",
      }),
      this.productRepository.create({
        name: "Loyalty Dessert",
        description: "Dessert for loyalty tests",
        price: 6.99,
        category: "dessert",
      }),
    ];
    return await this.productRepository.save(products);
  }

  private async createOrderHistory(
    customer: Customer,
    products: Product[]
  ): Promise<void> {
    const now = new Date();
    const dates = [
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    ];

    const orders = dates.map((date, index) =>
      this.orderRepository.create({
        customer,
        products: [products[index % products.length]],
        totalAmount: 15.99,
        status: OrderStatus.DELIVERED,
        createdAt: date,
        updatedAt: date,
      })
    );

    await this.orderRepository.save(orders);
  }
}
```

## 2. Refactorer les tests pour utiliser les fixtures spécifiques

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { LoyaltyFixtures } from "../fixtures/loyalty-fixtures";
import { LoyaltyService } from "../../src/loyalty/loyalty.service";
import { OrderService } from "../../src/order/order.service";
import { CreateOrderDto } from "../../src/order/dto/create-order.dto";

describe("LoyaltyService (e2e)", () => {
  let app: INestApplication;
  let fixtures: LoyaltyFixtures;
  let loyaltyService: LoyaltyService;
  let orderService: OrderService;

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

    fixtures = new LoyaltyFixtures(app);
    loyaltyService = app.get(LoyaltyService);
    orderService = app.get(OrderService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await fixtures.cleanup();
  });

  describe("Loyalty discounts", () => {
    it("should apply 10% discount for customers with more than 3 orders", async () => {
      // Setup test scenario
      const { loyalCustomer, products } =
        await fixtures.createLoyaltyTestScenario();
      const originalTotal = 25.99;

      const createOrderDto: CreateOrderDto = {
        customerId: loyalCustomer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test loyalty discount",
      };

      const order = await orderService.create(createOrderDto);

      const expectedTotal = parseFloat((originalTotal * 0.9).toFixed(2));
      expect(order.totalAmount).toBe(expectedTotal);
    });

    it("should not apply discount for customers with 3 or fewer orders", async () => {
      const { regularCustomer, products } =
        await fixtures.createLoyaltyTestScenario();
      const originalTotal = 25.99;

      const createOrderDto: CreateOrderDto = {
        customerId: regularCustomer.id,
        productIds: products.map((p) => p.id),
        totalAmount: originalTotal,
        notes: "Test no discount",
      };

      const order = await orderService.create(createOrderDto);

      expect(order.totalAmount).toBe(originalTotal);
    });
  });
});
```

## 3. Utiliser des bases de données de test séparées (optionnel)

Pour une isolation encore plus forte, vous pouvez créer des bases de données de test séparées par suite de tests :

```typescript
import { TypeOrmModule } from "@nestjs/typeorm";

export const getTestDatabaseConfig = (databaseName: string) => {
  return TypeOrmModule.forRoot({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "test",
    password: "test",
    database: databaseName,
    entities: [__dirname + "/../src/entities/*.entity.ts"],
    synchronize: true,
    dropSchema: true,
  });
};
```

## Avantages de cette approche :

1. **Isolation** : Chaque test crée ses propres données
2. **Lisibilité** : Les fixtures sont spécifiques au domaine testé
3. **Maintenance** : Plus facile de maintenir des fixtures simples
4. **Parallélisation** : Les tests peuvent être exécutés en parallèle
5. **Flexibilité** : Chaque test peut créer exactement les données dont il a besoin

Cette approche élimine les effets de bord et rend vos tests plus robustes et maintenables.

Similar code found with 1 license type

greg-ab: Peux-tu me donner un prompt qui permet de faire réaliser ces étapes par un agent IA ?

GitHub Copilot: Voici un prompt structuré pour faire réaliser ces étapes par un agent IA :

````markdown
# Refactoring des fixtures E2E pour découpler les tests

## Contexte

J'ai actuellement des tests E2E qui utilisent un fichier `global-fixtures.ts` partagé, ce qui crée un couplage fort entre mes tests et peut causer des effets de bord. Je veux découpler ces tests en créant des fixtures spécifiques par domaine.

## Objectif

Refactorer l'architecture des fixtures pour que chaque suite de tests E2E ait ses propres fixtures isolées.

## Étapes à réaliser

### 1. Analyser l'existant

- Examiner le fichier `global-fixtures.ts` pour comprendre les données créées
- Identifier les différents domaines métier (ordre, loyalty, etc.)
- Lister les dépendances entre les entités (Customer, Product, Order)

### 2. Créer des fixtures spécifiques par domaine

Pour chaque domaine identifié, créer un fichier de fixtures dédié :

- `test/fixtures/order-fixtures.ts`
- `test/fixtures/loyalty-fixtures.ts`
- etc.

Chaque classe de fixtures doit :

- Avoir un constructeur qui prend `INestApplication` en paramètre
- Avoir une méthode `createTestScenario()` qui retourne les données nécessaires pour ce domaine
- Avoir une méthode `cleanup()` pour nettoyer les données
- Créer uniquement les données minimales nécessaires pour les tests de ce domaine
- Éviter les références aux autres domaines

### 3. Refactorer les tests E2E

Pour chaque fichier de test E2E :

- Remplacer l'import de `GlobalFixtures` par la fixture spécifique
- Modifier le `beforeAll()` pour instancier la fixture appropriée
- Ajouter un `beforeEach()` qui appelle `cleanup()` pour isoler chaque test
- Adapter les tests pour utiliser les données retournées par `createTestScenario()`

### 4. Règles à respecter

- Chaque fixture doit être complètement indépendante
- Les données créées doivent être cohérentes avec le domaine testé
- Utiliser des noms explicites pour les données de test (ex: "Loyal Customer", "Order Test Customer")
- Nettoyer les données dans l'ordre inverse des dépendances FK
- Ne pas réutiliser de données entre les tests d'une même suite

### 5. Structure attendue

```
test/
├── fixtures/
│   ├── order-fixtures.ts
│   ├── loyalty-fixtures.ts
│   └── [other-domain]-fixtures.ts
├── order/
│   └── order.e2e-spec.ts (refactoré)
├── loyalty/
│   └── loyalty.e2e-spec.ts (refactoré)
└── [other-domains]/
```

### 6. Validation

- Vérifier que tous les tests passent individuellement
- Vérifier que les tests passent quand ils sont exécutés ensemble
- Confirmer qu'il n'y a plus d'effets de bord entre les tests
- S'assurer que les fixtures sont bien nettoyées après chaque test

## Contraintes techniques

- Utiliser TypeScript
- Framework NestJS avec TypeORM
- Entités : Customer, Product, Order
- Base de données PostgreSQL pour les tests
- Respecter les contraintes de clés étrangères lors du nettoyage

## Résultat attendu

Après refactoring, chaque suite de tests E2E doit être complètement isolée, avec ses propres fixtures qui créent uniquement les données nécessaires pour ce domaine spécifique.
````

Ce prompt donne un cadre clair et structuré pour qu'un agent IA puisse réaliser le refactoring étape par étape, en gardant le focus sur l'isolation et l'indépendance des tests.
