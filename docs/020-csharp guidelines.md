# C# Clean Architecture and Development Guidelines

## 序文

このファイルはC#コードを生成する際のルールを定義します。
クリーンアーキテクチャとSOLID原則に基づき、Microsoftのベストプラクティスを取り入れたガイドラインです。
このルールセットに従うことで、保守性が高く、テスト可能で、拡張性のあるコードベースを実現します。

## アーキテクチャ基本原則

### クリーンアーキテクチャのレイヤー構造

- ドメインレイヤー - すべてのビジネスエンティティとルールを含む最内層
- アプリケーションレイヤー - ユースケース、アプリケーションサービス、インターフェース定義
- インフラストラクチャレイヤー - 永続化、外部サービス連携、技術的実装
- プレゼンテーションレイヤー - UI、API、ユーザーインターフェース

### 依存関係の方向

- 依存関係は常に内側に向かわなければならない
- 外側のレイヤーは内側のレイヤーに依存するが、その逆は許されない
- ドメインレイヤーは他のどのレイヤーにも依存してはならない
- インターフェースは内側のレイヤーで定義し、外側のレイヤーで実装する

```text
// プロジェクト構造の例
// Solution/
//   ├── Domain/               // 最内層: ビジネスエンティティとルール
//   │   ├── Entities/
//   │   ├── ValueObjects/
//   │   └── Services/
//   ├── Application/          // ユースケース実装、依存はDomainのみ
//   │   ├── Commands/
//   │   ├── Queries/
//   │   └── Interfaces/
//   ├── Infrastructure/       // 技術的実装、依存はDomainとApplication
//   │   ├── Persistence/
//   │   ├── Services/
//   │   └── Configuration/
//   └── Presentation/         // ユーザーインターフェース、依存はApplication
//        ├── Web/             // MVCプロジェクト
//        │   ├── Controllers/
//        │   ├── ViewModels/ // Web専用ViewModel
//        │   └── Views/
//        │
//        └── Api/             // Web APIプロジェクト
//             ├── Controllers/
//             └── DTOs/       // API専用レスポンスオブジェクト
```

- PresentationはWebとApiなど複数存在しなければ子ディレクトリを用意する必要はない
- Solutionはアプリケーション名、Domain、Application、Infrastructure、Presentationをそれぞれプロジェクト名とする

## SOLID原則

### 単一責任の原則 (SRP)

- クラスは単一の責任のみを持つべき
- 変更理由が一つだけになるようにクラスを設計する
- 大きなクラスは小さな単一責任のクラスに分割する

```csharp
// 良い例: 単一責任を持つクラス
public class OrderValidator
{
    public ValidationResult ValidateOrder(Order order)
    {
        // 検証ロジックのみを含む
        if (order == null) throw new ArgumentNullException(nameof(order));
        // ... more validation logic
        return new ValidationResult { IsValid = true }; // Placeholder
    }
}

public class OrderProcessor
{
    private readonly IOrderRepository _repository;
    private readonly OrderValidator _validator;

    public OrderProcessor(IOrderRepository repository, OrderValidator validator)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
    }

    public void ProcessOrder(Order order)
    {
        var validationResult = _validator.ValidateOrder(order);
        if (!validationResult.IsValid)
        {
            throw new OrderValidationException(validationResult.Errors);
        }

        _repository.Save(order);
    }
}

// Supporting types for the example
public class Order { /* ... */ }
public interface IOrderRepository { void Save(Order order); }
public class ValidationResult { public bool IsValid { get; set; } public List<string> Errors { get; set; } = new List<string>(); }
public class OrderValidationException : Exception { public OrderValidationException(List<string> errors) : base(string.Join(", ", errors)) { } }
```

### 開放/閉鎖原則 (OCP)

- ソフトウェアエンティティは拡張に対しては開いているが、修正に対しては閉じているべき
- インターフェースと抽象クラスを活用して拡張ポイントを確保する
- 継承より構成を優先する

```csharp
// 良い例: 拡張に開いているが、修正には閉じている設計
public interface IDiscountStrategy
{
    decimal ApplyDiscount(Order order);
}

public class RegularDiscountStrategy : IDiscountStrategy
{
    public decimal ApplyDiscount(Order order) => order.Total * 0.05m;
}

public class PremiumDiscountStrategy : IDiscountStrategy
{
    public decimal ApplyDiscount(Order order) => order.Total * 0.15m;
}

// 新しい割引戦略を追加するためにこのクラスを変更する必要はない
public class DiscountService
{
    private readonly IDiscountStrategy _discountStrategy;

    public DiscountService(IDiscountStrategy discountStrategy)
    {
        _discountStrategy = discountStrategy ?? throw new ArgumentNullException(nameof(discountStrategy));
    }

    public decimal CalculateDiscount(Order order)
    {
        if (order == null) throw new ArgumentNullException(nameof(order));
        return _discountStrategy.ApplyDiscount(order);
    }
}

// Supporting type for the example
public class Order { public decimal Total { get; set; } /* ... */ }
```

### リスコフの置換原則 (LSP)

- サブタイプはそのベースタイプとして置換可能であるべき
- 継承関係においては、派生クラスは基底クラスの動作を尊重すべき
- 契約による設計（Design by Contract）を意識する

```csharp
// 良い例: 派生クラスはベースクラスの動作に準拠
public abstract class Shape
{
    public abstract double CalculateArea();
}

public class Rectangle : Shape
{
    public double Width { get; set; }
    public double Height { get; set; }

    public override double CalculateArea() => Width * Height;
}

public class Circle : Shape
{
    public double Radius { get; set; }

    public override double CalculateArea() => Math.PI * Radius * Radius;
}

// どのShapeのサブクラスでも問題なく動作する
public class AreaCalculator
{
    public double TotalArea(IEnumerable<Shape> shapes)
    {
        if (shapes == null) throw new ArgumentNullException(nameof(shapes));
        return shapes.Sum(s => s.CalculateArea());
    }
}
```

### インターフェース分離の原則 (ISP)

- クライアントは使用しないメソッドに依存すべきでない
- 大きなインターフェースは小さく特化したインターフェースに分割する
- ロールインターフェースを活用する

```csharp
// 良い例: 特化した小さなインターフェース
public interface IOrderReader
{
    Order GetById(Guid id);
    IEnumerable<Order> GetByCustomerId(Guid customerId);
}

public interface IOrderWriter
{
    void Save(Order order);
    void Update(Order order);
}

public interface IOrderDeleter
{
    void Delete(Guid id);
}

// 必要なインターフェースのみを使用
public class OrderReportingService
{
    private readonly IOrderReader _orderReader;

    public OrderReportingService(IOrderReader orderReader)
    {
        _orderReader = orderReader ?? throw new ArgumentNullException(nameof(orderReader));
    }

    public OrderSummary GenerateReport(Guid customerId)
    {
        var orders = _orderReader.GetByCustomerId(customerId);
        // レポート生成ロジック
        return new OrderSummary(); // Placeholder
    }
}

// Supporting types for the example
public class Order { /* ... */ }
public class OrderSummary { /* ... */ }
```

### 依存性逆転の原則 (DIP)

- 上位モジュールは下位モジュールに依存すべきでない。どちらも抽象に依存すべき
- 抽象は詳細に依存すべきでない。詳細が抽象に依存すべき
- 依存性注入を活用して実装の詳細を隠蔽する

```csharp
// 良い例: 上位モジュールと下位モジュールがともに抽象に依存
public interface INotificationService
{
    Task SendAsync(string recipient, string subject, string message);
}

// 下位モジュール: インターフェースを実装
public class EmailService : INotificationService
{
    public async Task SendAsync(string recipient, string subject, string message)
    {
        // メール送信の実装
        Console.WriteLine($"Email sent to {recipient}: {subject}");
        await Task.CompletedTask;
    }
}

public class SmsService : INotificationService
{
    public async Task SendAsync(string recipient, string subject, string message)
    {
        // SMS送信の実装
        Console.WriteLine($"SMS sent to {recipient}: {subject}");
        await Task.CompletedTask;
    }
}

// 上位モジュール: インターフェースに依存
public class NotificationManager
{
    private readonly INotificationService _notificationService;

    public NotificationManager(INotificationService notificationService)
    {
        _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
    }

    public async Task NotifyUserAsync(User user, Notification notification)
    {
        if (user == null) throw new ArgumentNullException(nameof(user));
        if (notification == null) throw new ArgumentNullException(nameof(notification));

        await _notificationService.SendAsync(
            user.ContactInfo,
            notification.Subject,
            notification.Message
        );
    }
}

// Supporting types for the example
public class User { public string ContactInfo { get; set; } /* ... */ }
public class Notification { public string Subject { get; set; } public string Message { get; set; } /* ... */ }
```

## 命名規則とコーディングスタイル

### 一般的な命名規則

- **名前空間**: PascalCaseで`[Company].[Product].[Module].[Feature]`の形式
- **クラス/インターフェース**: PascalCaseで、クラスは名詞、インターフェースは形容詞+名詞またはI+名詞
- **メソッド**: PascalCaseで動詞または動詞句
- **プロパティ**: PascalCaseで名詞または形容詞+名詞
- **変数/パラメータ**: camelCaseで意味のある名前
- **定数**: PascalCaseで説明的な名前
- **プライベートフィールド**: camelCaseで先頭にアンダースコア(\_)

```csharp
// 命名規則の例
namespace MyCompany.MyProduct.Billing.Invoices
{
    public interface ITaxCalculator
    {
        decimal CalculateTax(decimal amount);
    }

    public class Invoice
    {
        public Guid OrderId { get; set; }
        public Guid CustomerId { get; set; }
        public DateTime InvoiceDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public interface IInvoiceGenerator
    {
        Invoice GenerateInvoice(Order order);
    }

    public class InvoiceGenerator : IInvoiceGenerator
    {
        private readonly ITaxCalculator _taxCalculator;
        private const decimal MinimumOrderAmount = 10.0m;

        public InvoiceGenerator(ITaxCalculator taxCalculator)
        {
            _taxCalculator = taxCalculator ?? throw new ArgumentNullException(nameof(taxCalculator));
        }

        public Invoice GenerateInvoice(Order order)
        {
            if (order == null) throw new ArgumentNullException(nameof(order));

            var subtotal = CalculateSubtotal(order);
            if (subtotal < MinimumOrderAmount)
            {
                throw new InvalidOperationException($"Order amount {subtotal} is less than minimum {MinimumOrderAmount}");
            }

            var taxAmount = _taxCalculator.CalculateTax(subtotal);

            return new Invoice
            {
                OrderId = order.Id,
                CustomerId = order.CustomerId,
                InvoiceDate = DateTime.UtcNow,
                SubTotal = subtotal,
                TaxAmount = taxAmount,
                TotalAmount = subtotal + taxAmount
            };
        }

        private decimal CalculateSubtotal(Order order)
        {
            // 仮実装
            return order.Items?.Sum(item => item.Quantity * item.Price) ?? 0m;
        }
    }

    // Supporting types for the example
    public class Order
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public List<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
    public class OrderItem
    {
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}
```

### ファイルとフォルダ構成

- ファイル名はクラス名と一致させる
- 1ファイル1クラス（小さな関連クラスは例外）
- フォルダ構造は名前空間と一致させる
- 機能ごとにフォルダを整理する
- テストプロジェクトは対応する製品コードと同じ構造にする

### コードスタイル

- インデントは4スペース（タブではなく）
- 中括弧は新しい行に配置する（Allmanスタイル）
- すべての制御構造に中括弧を使用する（1行の場合も）
- 1行は120文字以内に収める
- 意味のある論理的なブロック間には空行を入れる
- 変数宣言は使用直前に行う

```csharp
// コードスタイルの例
public bool IsValidOrder(Order order)
{
    if (order == null)
    {
        return false;
    }

    if (order.Items == null || !order.Items.Any()) // Using Any() instead of Count == 0
    {
        return false;
    }

    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0 || item.Price < 0)
        {
            return false;
        }
    }

    return true;
}

// Supporting types for the example
public class Order
{
    public List<OrderItem> Items { get; set; } = new List<OrderItem>();
}
public class OrderItem
{
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}
```

## ドメイン駆動設計 (DDD) の適用

### エンティティ

- 同一性（ID）によって識別される
- エンティティは不変条件を自身で検証する
- エンティティのビジネスロジックはエンティティクラス内に含める
- IDはValue Objectとして実装する

```csharp
// エンティティの例
public readonly record struct OrderId(Guid Value);
public readonly record struct CustomerId(Guid Value);
public readonly record struct ProductId(Guid Value);
public readonly record struct OrderItemId(Guid Value);

public enum OrderStatus { Pending, Submitted, Shipped, Cancelled }

public class Order
{
    private readonly List<OrderItem> _items = new();

    public OrderId Id { get; private set; }
    public CustomerId CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    public string Currency { get; private set; } // Added for Money Value Object

    private Order() { } // ORMのためのコンストラクタ

    public Order(OrderId id, CustomerId customerId, string currency = "USD")
    {
        Id = id;
        CustomerId = customerId;
        Status = OrderStatus.Pending;
        CreatedAt = DateTime.UtcNow;
        Currency = currency; // Assuming default currency or passed in
    }

    public void AddItem(ProductId productId, int quantity, Money unitPrice)
    {
        if (Status != OrderStatus.Pending)
        {
            throw new InvalidOperationException("Cannot add items to non-pending order.");
        }

        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be positive.");
        }

        if (unitPrice.Currency != Currency)
        {
            throw new InvalidOperationException("Item currency must match order currency.");
        }

        var existingItem = _items.FirstOrDefault(i => i.ProductId == productId);
        if (existingItem != null)
        {
            existingItem.IncreaseQuantity(quantity);
        }
        else
        {
            _items.Add(new OrderItem(new OrderItemId(Guid.NewGuid()), Id, productId, quantity, unitPrice));
        }
    }

    public void Submit()
    {
        if (Status != OrderStatus.Pending)
        {
            throw new InvalidOperationException("Only pending orders can be submitted.");
        }

        if (!_items.Any())
        {
            throw new InvalidOperationException("Cannot submit order without items.");
        }

        Status = OrderStatus.Submitted;
        // ここでドメインイベントを発行することも考えられる (e.g., OrderSubmittedEvent)
    }
}

public class OrderItem
{
    public OrderItemId Id { get; private set; }
    public OrderId OrderId { get; private set; } // To link back to the Order
    public ProductId ProductId { get; private set; }
    public int Quantity { get; private set; }
    public Money UnitPrice { get; private set; }

    private OrderItem() { } // ORM

    public OrderItem(OrderItemId id, OrderId orderId, ProductId productId, int quantity, Money unitPrice)
    {
        Id = id;
        OrderId = orderId;
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    internal void IncreaseQuantity(int additionalQuantity)
    {
        if (additionalQuantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(additionalQuantity), "Additional quantity must be positive.");
        }
        Quantity += additionalQuantity;
    }
}
```

### Value Objects

- その属性によって識別される（IDを持たない）
- 常に不変（Immutable）
- 値の等価性によって比較される
- 自己完結型で副作用を持たない

```csharp
// Value Objectの例: Money
public readonly record struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        if (amount < 0)
        {
            throw new ArgumentException("Amount cannot be negative.", nameof(amount));
        }

        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
        {
            throw new ArgumentException("Currency must be a valid 3-letter ISO code.", nameof(currency));
        }

        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }

    public static Money Zero(string currency = "USD") => new Money(0, currency);

    public Money Add(Money other)
    {
        if (other.Currency != Currency)
        {
            throw new InvalidOperationException($"Cannot add money with different currencies: {Currency} and {other.Currency}.");
        }

        return new Money(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)
    {
        if (other.Currency != Currency)
        {
            throw new InvalidOperationException($"Cannot subtract money with different currencies: {Currency} and {other.Currency}.");
        }

        return new Money(Amount - other.Amount, Currency);
    }

    public Money Multiply(decimal multiplier)
    {
        // multiplier can be negative for discounts etc.
        return new Money(Amount * multiplier, Currency);
    }

    public override string ToString() => $"{Amount:F2} {Currency}"; // Format to 2 decimal places
}
```

### 集約

- トランザクション境界を定義する関連エンティティのグループ
- 集約ルート（親エンティティ）を介してのみアクセスする
- 集約内の整合性は常に保持する
- リポジトリは集約単位で操作する

```csharp
// 集約ルート (Order) と集約内のエンティティ (OrderItem) の例
// Order クラスは既にエンティティセクションで集約ルートとして設計されている
// OrderItem クラスも同様に設計されている

// Order クラスに追加 (集約内のエンティティを管理するメソッドの例)
public partial class Order // Assuming Order is already defined as an Aggregate Root
{
    // _items field and other properties/methods are assumed to be defined from Entity section
    // private readonly List<OrderItem> _items = new();
    // public OrderId Id { get; private set; }
    // public CustomerId CustomerId { get; private set; }
    // public OrderStatus Status { get; private set; }
    // public DateTime CreatedAt { get; private set; }
    // public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    // public string Currency { get; private set; }

    public void RemoveItem(OrderItemId itemId)
    {
        if (Status != OrderStatus.Pending)
        {
            throw new InvalidOperationException("Cannot remove items from non-pending order.");
        }

        var item = _items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            // または、何もしないか、Resultパターンで失敗を返す
            throw new InvalidOperationException($"Item with ID {itemId.Value} not found in order.");
        }

        _items.Remove(item);
    }
}
```

### ドメインサービス

- 単一のエンティティに自然に属さない操作を実装する
- 複数の集約にまたがる操作はドメインサービスで実装する
- ステートレスにする

```csharp
// ドメインサービスの例
public interface IProductRepository // Assuming this exists for product details
{
    Task<Product> GetByIdAsync(ProductId id);
}

public class Product // Placeholder for Product aggregate
{
    public ProductId Id { get; set; }
    public Money Price { get; set; }
    // other properties
}

public interface IDiscountPolicy // Example of a policy used by domain service
{
    Money CalculateDiscount(Order order, Money subtotal);
}

public class OrderPricingService
{
    private readonly IProductRepository _productRepository;
    private readonly IDiscountPolicy _discountPolicy;

    public OrderPricingService(IProductRepository productRepository, IDiscountPolicy discountPolicy)
    {
        _productRepository = productRepository ?? throw new ArgumentNullException(nameof(productRepository));
        _discountPolicy = discountPolicy ?? throw new ArgumentNullException(nameof(discountPolicy));
    }

    public async Task<OrderPricingSummary> CalculateOrderPriceAsync(Order order)
    {
        if (order == null) throw new ArgumentNullException(nameof(order));

        Money subtotal = Money.Zero(order.Currency);

        foreach (var item in order.Items)
        {
            // Item.UnitPrice should ideally be set when item is added based on product price at that time
            // If Item.UnitPrice is not reliable, fetch current product price (but be wary of price changes after order placement)
            // For simplicity, assume item.UnitPrice is already correct.
            subtotal = subtotal.Add(item.UnitPrice.Multiply(item.Quantity));
        }

        var discount = _discountPolicy.CalculateDiscount(order, subtotal);
        var discountedSubtotal = subtotal.Subtract(discount);
        var tax = CalculateTax(discountedSubtotal); // Assuming a simple tax calculation
        var total = discountedSubtotal.Add(tax);

        return new OrderPricingSummary(subtotal, discount, tax, total);
    }

    private Money CalculateTax(Money amount) // This might be a separate TaxService
    {
        // 仮の税金計算ロジック
        return amount.Multiply(0.1m); // 10% tax
    }
}

public record OrderPricingSummary(Money Subtotal, Money Discount, Money Tax, Money Total);
```

## アプリケーションレイヤーのパターン

### CQRS パターン

- Command Query Responsibility Segregation（コマンドクエリ責務分離）
- コマンド（状態変更）とクエリ（データ取得）を分離する
- MediatRライブラリを使った実装

```csharp
// CQRSパターンの例 (MediatRを使用)
// Base types for Result and Error
public record Error(string Code, string Message);

public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    protected Result(bool isSuccess, Error error)
    {
        if (isSuccess && error != null) throw new InvalidOperationException("Successful result cannot have an error.");
        if (!isSuccess && error == null) throw new InvalidOperationException("Failure result must have an error.");
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, null);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(true, value, null); // Corrected generic call
    public static Result<T> Failure<T>(Error error) => new(false, default, error); // Corrected generic call
}

public class Result<T> : Result
{
    public T Value { get; }
    protected internal Result(bool isSuccess, T value, Error error) : base(isSuccess, error)
    {
        // Ensure value is not accessed if not successful, base constructor handles error checks
        if (isSuccess) Value = value;
        // else Value remains default, but shouldn't be accessed due to IsSuccess check
    }
}


// コマンド（状態変更）
public record CreateOrderCommand(Guid CustomerId, List<OrderItemDto> Items) : IRequest<Result<Guid>>;

public class OrderItemDto // Used in command/query
{
    public Guid ProductId { get; init; }
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; } // Assuming price is known at command time
    public string Currency { get; init; } // Assuming currency is known
}

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Result<Guid>>
{
    private readonly IOrderRepository _orderRepository; // Domain layer repository
    private readonly IUnitOfWork _unitOfWork;

    public CreateOrderCommandHandler(IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateOrderCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var orderId = new OrderId(Guid.NewGuid());
            var customerId = new CustomerId(command.CustomerId);

            // Assuming a default currency or it's part of the command
            var orderCurrency = command.Items.FirstOrDefault()?.Currency ?? "USD";
            var order = new Order(orderId, customerId, orderCurrency);

            foreach (var itemDto in command.Items)
            {
                var productId = new ProductId(itemDto.ProductId);
                // Ensure item currency matches order currency
                if (itemDto.Currency != orderCurrency)
                {
                    return Result.Failure<Guid>(new Error("Order.Creation.CurrencyMismatch", $"Item currency {itemDto.Currency} does not match order currency {orderCurrency}."));
                }
                var unitPrice = new Money(itemDto.UnitPrice, itemDto.Currency);
                order.AddItem(productId, itemDto.Quantity, unitPrice);
            }

            if (!order.Items.Any()) // Domain rule: Order must have items
            {
                 return Result.Failure<Guid>(new Error("Order.Creation.NoItems", "Order must contain at least one item."));
            }

            await _orderRepository.AddAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success(orderId.Value);
        }
        catch (ArgumentException ex) // Catch specific domain validation exceptions
        {
            return Result.Failure<Guid>(new Error("Order.Creation.InvalidArgument", ex.Message));
        }
        catch (InvalidOperationException ex) // Catch specific domain operation exceptions
        {
            return Result.Failure<Guid>(new Error("Order.Creation.InvalidOperation", ex.Message));
        }
        catch (Exception ex) // Catch-all for other unexpected issues
        {
            // Log the exception ex
            return Result.Failure<Guid>(new Error("Order.Creation.Failed", $"An unexpected error occurred: {ex.Message}"));
        }
    }
}

// クエリ（データ取得）
public record GetOrderByIdQuery(Guid OrderId) : IRequest<Result<OrderDto>>;

public class OrderDto // Read model for queries
{
    public Guid Id { get; init; }
    public Guid CustomerId { get; init; }
    public string Status { get; init; }
    public List<OrderItemDto> Items { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; }
}

public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, Result<OrderDto>>
{
    // For queries, you might use a different data access mechanism (e.g., Dapper, direct DbContext)
    // that is optimized for reads, bypassing the domain model if necessary.
    // Here, for simplicity, we'll assume IOrderRepository can also provide read data.
    private readonly IOrderRepository _orderRepository; // Or a specific IOrderQueryRepository

    public GetOrderByIdQueryHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<Result<OrderDto>> Handle(GetOrderByIdQuery query, CancellationToken cancellationToken)
    {
        var orderId = new OrderId(query.OrderId);
        var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken); // Fetches domain model

        if (order == null)
        {
            return Result.Failure<OrderDto>(new Error("Order.NotFound", $"Order with ID {query.OrderId} not found."));
        }

        return Result.Success(MapToDto(order)); // Map domain model to DTO
    }

    private OrderDto MapToDto(Order order)
    {
        // AutoMapper or manual mapping logic
        return new OrderDto
        {
            Id = order.Id.Value,
            CustomerId = order.CustomerId.Value,
            Status = order.Status.ToString(),
            Items = order.Items.Select(item => new OrderItemDto
            {
                ProductId = item.ProductId.Value,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice.Amount,
                Currency = item.UnitPrice.Currency
            }).ToList(),
            TotalAmount = order.Items.Sum(i => i.UnitPrice.Amount * i.Quantity), // Recalculate or store
            Currency = order.Currency
        };
    }
}

// MediatR, IRequest, IRequestHandler are from MediatR library
// IUnitOfWork is a custom interface for transaction management
public interface IRequest<TResponse> { } // From MediatR
public interface IRequestHandler<TRequest, TResponse> where TRequest : IRequest<TResponse> // From MediatR
{
    Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken);
}
public interface IUnitOfWork { Task SaveChangesAsync(CancellationToken cancellationToken); }
```

### バリデーション

- コマンド/クエリの入力検証はアプリケーションレイヤーで行う
- FluentValidationを使用して宣言的な検証ルールを定義する
- パイプラインを使って自動的にバリデーションを適用する

```csharp
// バリデーションの例 (FluentValidation と MediatR Pipeline)
// Requires FluentValidation nuget package

public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();

        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("Order must contain at least one item.");

        RuleForEach(x => x.Items).SetValidator(new OrderItemDtoValidator());
    }
}

public class OrderItemDtoValidator : AbstractValidator<OrderItemDto>
{
    public OrderItemDtoValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity must be greater than zero.");

        RuleFor(x => x.UnitPrice)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Unit price cannot be negative.");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .Length(3)
            .WithMessage("Currency must be a 3-letter code.");
    }
}

// MediatR Pipeline Behavior for validation
// This is a simplified MediatR IPipelineBehavior for demonstration.
public interface IPipelineBehavior<in TRequest, TResponse>
    where TRequest : IRequest<TResponse> // MediatR IRequest
{
    Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken, RequestHandlerDelegate<TResponse> next);
}
public delegate Task<TResponse> RequestHandlerDelegate<TResponse>(); // From MediatR

// Custom ValidationException to be potentially handled by middleware
public class ValidationException : Exception
{
    public IReadOnlyCollection<ValidationFailure> Errors { get; }
    public ValidationException(IEnumerable<ValidationFailure> errors)
        : base("One or more validation failures have occurred.")
    {
        Errors = errors.ToList().AsReadOnly();
    }
}


public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    where TResponse : Result // Assuming all responses use the Result pattern
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken, RequestHandlerDelegate<TResponse> next)
    {
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Any())
        {
            // Instead of throwing, return a Failure Result
            // This requires TResponse to be constructible as a Failure Result.
            // We need a way to create a generic Result<T>.Failure from a non-generic context
            // or ensure Result itself can represent failure.
            var error = new Error("Validation.Error",
                string.Join("; ", failures.Select(f => $"{f.PropertyName}: {f.ErrorMessage}")));

            // This is tricky because TResponse is generic.
            // We assume Result<T>.Failure(error) can be cast to TResponse if TResponse is Result<SomeType>
            // This often involves reflection or a more complex Result hierarchy if TResponse is not always Result<T>
            // For simplicity, assuming a helper method on Result or specific handling:
            if (typeof(TResponse).IsGenericType && typeof(TResponse).GetGenericTypeDefinition() == typeof(Result<>))
            {
                var genericArgument = typeof(TResponse).GetGenericArguments()[0];
                var failureMethod = typeof(Result).GetMethod("Failure", 1, new[] { typeof(Error) })
                                                 .MakeGenericMethod(genericArgument);
                return (TResponse)failureMethod.Invoke(null, new object[] { error });
            }
            // Fallback if TResponse is just Result (non-generic)
            if (typeof(TResponse) == typeof(Result))
            {
                 return (TResponse)(object)Result.Failure(error);
            }

            // If the above dynamic invocation is too complex for rules, throw or simplify:
            throw new ValidationException(failures);
        }

        return await next();
    }
}

// FluentValidation types (simplified for rule compilation)
public abstract class AbstractValidator<T> : IValidator<T>
{
    protected IRuleBuilderInitial<T, TProperty> RuleFor<TProperty>(System.Linq.Expressions.Expression<Func<T, TProperty>> expression) { return null; }
    protected IRuleBuilderInitial<T, IEnumerable<TElement>> RuleForEach<TElement>(System.Linq.Expressions.Expression<Func<T, IEnumerable<TElement>>> expression) { return null; }
    public virtual FluentValidation.Results.ValidationResult Validate(ValidationContext<T> context) => throw new NotImplementedException();
    public virtual Task<FluentValidation.Results.ValidationResult> ValidateAsync(ValidationContext<T> context, CancellationToken token = default) => throw new NotImplementedException();
}
public interface IValidator<T> : FluentValidation.IValidator { } // FluentValidation.IValidator
public interface IRuleBuilderInitial<T, TProperty> : FluentValidation.IRuleBuilder<T, TProperty> { } // from FluentValidation

// FluentValidation namespace items for rule compilation
namespace FluentValidation
{
    public interface IValidator { }
    public interface IRuleBuilder<T, TProperty> { }
    public interface IRuleBuilderOptions<T, TProperty> : IRuleBuilder<T, TProperty> { }
    public class ValidationContext<T> { public ValidationContext(T instanceToValidate) { } }
    namespace Results
    {
        public class ValidationResult { public List<ValidationFailure> Errors { get; set; } = new List<ValidationFailure>(); public bool IsValid => !Errors.Any(); }
        public class ValidationFailure { public string PropertyName { get; set; } public string ErrorMessage { get; set; } public ValidationFailure(string propertyName, string errorMessage) { PropertyName = propertyName; ErrorMessage = errorMessage;} }
    }
    public static class DefaultValidatorExtensions
    {
        public static IRuleBuilderOptions<T, TProperty> NotEmpty<T, TProperty>(this IRuleBuilder<T, TProperty> ruleBuilder) => (IRuleBuilderOptions<T, TProperty>)ruleBuilder;
        public static IRuleBuilderOptions<T, TProperty> Length<T, TProperty>(this IRuleBuilder<T, TProperty> ruleBuilder, int exactLength) => (IRuleBuilderOptions<T, TProperty>)ruleBuilder;
        public static IRuleBuilderOptions<T, TProperty> GreaterThan<T, TProperty>(this IRuleBuilder<T, TProperty> ruleBuilder, TProperty valueToCompare) where TProperty : IComparable<TProperty>, IComparable => (IRuleBuilderOptions<T, TProperty>)ruleBuilder;
        public static IRuleBuilderOptions<T, TProperty> GreaterThanOrEqualTo<T, TProperty>(this IRuleBuilder<T, TProperty> ruleBuilder, TProperty valueToCompare) where TProperty : IComparable<TProperty>, IComparable => (IRuleBuilderOptions<T, TProperty>)ruleBuilder;
        public static IRuleBuilderOptions<T, TProperty> WithMessage<T, TProperty>(this IRuleBuilderOptions<T, TProperty> rule, string message) => rule;
        public static void SetValidator<T, TCollectionElement>(this IRuleBuilder<T, IEnumerable<TCollectionElement>> ruleBuilder, IValidator<TCollectionElement> validator) { }
    }
}

```

### 結果パターン

- 例外ではなく戻り値を使用して成功/失敗を表現する
- エラー情報を明示的に伝達する
- 例外はシステムの異常状態にのみ使用する

```csharp
// 結果パターンの例 (CQRSセクションの Result と Error を参照)
// 使用例
public interface IMapper { TDestination Map<TDestination>(object source); } // Placeholder for AutoMapper or similar
public class SomeController // : ControllerBase (if ASP.NET Core)
{
    private readonly IMediator _mediator; // MediatR IMediator
    private readonly IMapper _mapper;

    public SomeController(IMediator mediator, IMapper mapper)
    {
        _mediator = mediator;
        _mapper = mapper;
    }

    public async Task<IActionResult> CreateOrderEndpoint([FromBody] CreateOrderApiRequest request)
    {
        var command = _mapper.Map<CreateOrderCommand>(request); // Map API request to Command
        var result = await _mediator.Send(command); // Result<Guid>

        if (result.IsFailure)
        {
            // Map error to appropriate HTTP response
            // Example: Check if the failure was due to validation (if ValidationBehavior returns Result.Failure)
            if (result.Error.Code == "Validation.Error")
            {
                return new BadRequestObjectResult(new { title = "Validation Failed", detail = result.Error.Message, status = 400, errors = result.Error.Message /* or parse structured errors */ });
            }
            if (result.Error.Code == "Order.NotFound") // Example from GetOrderByIdQuery
            {
                 return new NotFoundObjectResult(new { title = "Not Found", detail = result.Error.Message, status = 404 });
            }
            // Default to 400 for other business rule failures
            return new BadRequestObjectResult(new { title = "Order creation failed", detail = result.Error.Message, status = 400 });
        }

        // Access result.Value only if IsSuccess is true (Result<T> pattern)
        var orderIdValue = ((Result<Guid>)result).Value;

        // Return 201 Created with location header
        return new CreatedAtActionResult(nameof(GetOrderByIdEndpoint), "SomeController", new { id = orderIdValue }, new { orderId = orderIdValue });
    }

    public async Task<IActionResult> GetOrderByIdEndpoint(Guid id)
    {
        // Placeholder for actual GetById endpoint that would use GetOrderByIdQuery
        var query = new GetOrderByIdQuery(id);
        var result = await _mediator.Send(query); // Result<OrderDto>

        if (result.IsFailure)
        {
            if (result.Error.Code == "Order.NotFound")
            {
                 return new NotFoundObjectResult(new { title = "Not Found", detail = result.Error.Message, status = 404 });
            }
            return new BadRequestObjectResult(new { title = "Failed to get order", detail = result.Error.Message, status = 400 });
        }
        var orderDtoValue = ((Result<OrderDto>)result).Value;
        return new OkObjectResult(orderDtoValue);
    }
}

// Supporting types for the example
public class CreateOrderApiRequest { public Guid CustomerId { get; set; } public List<OrderItemDto> Items { get; set; } /* ... */ }
public interface IActionResult { } // ASP.NET Core IActionResult
public class BadRequestObjectResult : IActionResult { public BadRequestObjectResult(object error) { /* ... */ } }
public class CreatedAtActionResult : IActionResult { public CreatedAtActionResult(string actionName, string controllerName, object routeValues, object value) { /* ... */ } }
public class OkObjectResult : IActionResult { public OkObjectResult(object value) { /* ... */ } }
public class NotFoundObjectResult : IActionResult { public NotFoundObjectResult(object value) { /* ... */ } }
public interface IMediator { Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default); } // MediatR IMediator
public class FromBodyAttribute : Attribute { } // ASP.NET Core attribute
```

## インフラストラクチャの実装

### リポジトリパターン

- ドメインオブジェクトの永続化と取得を抽象化する
- インターフェースはアプリケーションレイヤーで定義する
- 実装はインフラストラクチャレイヤーで行う
- 集約の境界を尊重する

```csharp
// リポジトリパターンの例

// インターフェース定義（アプリケーションレイヤー）
// IOrderRepository はドメイン駆動設計セクションの IOrderRepository を想定
// public interface IOrderRepository
// {
//     Task<Order> GetByIdAsync(OrderId id, CancellationToken cancellationToken);
//     Task<IEnumerable<Order>> GetByCustomerIdAsync(CustomerId customerId, CancellationToken cancellationToken);
//     Task AddAsync(Order order, CancellationToken cancellationToken);
//     Task UpdateAsync(Order order, CancellationToken cancellationToken);
// }


// 実装（インフラストラクチャレイヤー - Entity Framework Core を使用した例）
// Requires Microsoft.EntityFrameworkCore nuget package
public class ApplicationDbContext : Microsoft.EntityFrameworkCore.DbContext // Entity Framework DbContext
{
    public ApplicationDbContext(Microsoft.EntityFrameworkCore.DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public Microsoft.EntityFrameworkCore.DbSet<OrderEntity> Orders { get; set; } // Represents the table
    // Other DbSets

    protected override void OnModelCreating(Microsoft.EntityFrameworkCore.ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<OrderEntity>(builder =>
        {
            builder.HasKey(o => o.Id);
            builder.Property(o => o.Id).ValueGeneratedNever();

            // Example of mapping a Value Object owned by the entity
            builder.OwnsOne(o => o.CustomerIdValue, ownedNavigationBuilder => {
                ownedNavigationBuilder.Property(c => c.Value).HasColumnName("CustomerId").IsRequired();
            });

            builder.Property(o => o.Status).IsRequired().HasMaxLength(50);
            builder.Property(o => o.Currency).IsRequired().HasMaxLength(3);

            // For OrderItems, typically a separate OrderItemEntity and a HasMany relationship.
            // For simplicity here, if it were a simple collection of value types, OwnsMany could be used.
            // If ItemsJson is used:
            // builder.Property(o => o.ItemsJson);
        });
    }
}

// A DB entity. Mappings can be complex.
public class OrderEntity
{
    public Guid Id { get; set; }
    public CustomerIdValueObject CustomerIdValue { get; set; } // Value object for EF Core
    public string Status { get; set; }
    public DateTime CreatedAt { get; set; }
    // public string ItemsJson { get; set; } // Example if items are serialized
    public List<OrderItemEntity> Items { get; set; } = new List<OrderItemEntity>(); // Proper collection
    public string Currency { get; set; }
}

public class OrderItemEntity // Example for a related entity
{
    public Guid Id { get; set; } // PK for OrderItemEntity
    public Guid OrderId { get; set; } // FK to OrderEntity
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPriceAmount { get; set; }
    public string UnitPriceCurrency { get; set; }
}


public record CustomerIdValueObject(Guid Value); // EF Core can map records as owned types

public class OrderRepository : IOrderRepository // Implements domain interface
{
    private readonly ApplicationDbContext _dbContext;
    // private readonly IMapper _mapper; // For mapping between domain and entity (e.g., AutoMapper)

    public OrderRepository(ApplicationDbContext dbContext /*, IMapper mapper*/)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        // _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<Order> GetByIdAsync(OrderId id, CancellationToken cancellationToken)
    {
        var orderEntity = await _dbContext.Orders
            .Include(o => o.Items) // Eager load items
            .FirstOrDefaultAsync(o => o.Id == id.Value, cancellationToken);

        return orderEntity != null ? MapToDomainModel(orderEntity) : null;
    }

    public async Task<IEnumerable<Order>> GetByCustomerIdAsync(CustomerId customerId, CancellationToken cancellationToken)
    {
        var orderEntities = await _dbContext.Orders
            .Include(o => o.Items)
            .Where(o => o.CustomerIdValue.Value == customerId.Value)
            .ToListAsync(cancellationToken);

        return orderEntities.Select(MapToDomainModel).ToList();
    }

    public async Task AddAsync(Order order, CancellationToken cancellationToken)
    {
        var orderEntity = MapToEntity(order);
        await _dbContext.Orders.AddAsync(orderEntity, cancellationToken);
        // No SaveChangesAsync here, that's UnitOfWork's responsibility
    }

    public async Task UpdateAsync(Order order, CancellationToken cancellationToken)
    {
        // For updates, fetch the existing entity, apply changes from domain model, then save.
        var existingEntity = await _dbContext.Orders
                                     .Include(o => o.Items)
                                     .FirstOrDefaultAsync(e => e.Id == order.Id.Value, cancellationToken);
        if (existingEntity != null)
        {
            MapDomainToExistingEntity(order, existingEntity);
            _dbContext.Orders.Update(existingEntity);
        }
        // else: handle not found, though Update implies it exists. Could throw or be idempotent.
    }

    private Order MapToDomainModel(OrderEntity entity)
    {
        // Manual mapping. AutoMapper is recommended for complex scenarios.
        // This is a crucial part for DDD: reconstituting the aggregate root.
        // It might involve a private constructor or a static factory method on Order.
        var orderId = new OrderId(entity.Id);
        var customerId = new CustomerId(entity.CustomerIdValue.Value);

        // Example: Order.Reconstitute(id, customerId, statusEnum, createdAt, currency, items)
        // For simplicity, assuming Order has a constructor or setters accessible for mapping.
        var order = new Order(orderId, customerId, entity.Currency); // This might set defaults

        // Manually set other properties not covered by a simple constructor, potentially using reflection for private setters if strict DDD.
        // Reflection for setting private fields (example, not necessarily recommended for all cases):
        // typeof(Order).GetProperty(nameof(Order.Status)).SetValue(order, Enum.Parse<OrderStatus>(entity.Status));
        // typeof(Order).GetProperty(nameof(Order.CreatedAt)).SetValue(order, entity.CreatedAt);

        // For items:
        foreach (var itemEntity in entity.Items)
        {
            var productId = new ProductId(itemEntity.ProductId);
            var unitPrice = new Money(itemEntity.UnitPriceAmount, itemEntity.UnitPriceCurrency);
            // order.AddItem(productId, itemEntity.Quantity, unitPrice); // This would trigger domain logic
            // Better to have a way to reconstruct items without triggering domain events/logic intended for new item additions.
            // e.g., by adding to a backing field directly or via a specific reconstitution method.
            // var orderItem = new OrderItem(new OrderItemId(itemEntity.Id), orderId, productId, itemEntity.Quantity, unitPrice);
            // var itemsList = (List<OrderItem>)order.GetType().GetField("_items", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance).GetValue(order);
            // itemsList.Add(orderItem);
        }
        return order; // Placeholder for a fully mapped domain model
    }

    private OrderEntity MapToEntity(Order domainModel)
    {
        // Manual mapping or AutoMapper.
        var entity = new OrderEntity
        {
            Id = domainModel.Id.Value,
            CustomerIdValue = new CustomerIdValueObject(domainModel.CustomerId.Value),
            Status = domainModel.Status.ToString(),
            CreatedAt = domainModel.CreatedAt,
            Currency = domainModel.Currency,
            Items = domainModel.Items.Select(item => new OrderItemEntity
            {
                Id = item.Id.Value, // Assuming OrderItem has an Id
                OrderId = domainModel.Id.Value,
                ProductId = item.ProductId.Value,
                Quantity = item.Quantity,
                UnitPriceAmount = item.UnitPrice.Amount,
                UnitPriceCurrency = item.UnitPrice.Currency
            }).ToList()
        };
        return entity;
    }

    private void MapDomainToExistingEntity(Order domainModel, OrderEntity existingEntity)
    {
        // Apply changes from domainModel to existingEntity
        existingEntity.Status = domainModel.Status.ToString();
        existingEntity.Currency = domainModel.Currency; // If currency can change
        // More complex logic for collections: identify added, removed, modified items
        // Example for items (simplified - assumes full replacement or complex diff logic):
        existingEntity.Items.Clear(); // Simplistic: remove all and re-add
        foreach(var domainItem in domainModel.Items)
        {
            existingEntity.Items.Add(new OrderItemEntity
            {
                Id = domainItem.Id.Value,
                OrderId = domainModel.Id.Value,
                ProductId = domainItem.ProductId.Value,
                Quantity = domainItem.Quantity,
                UnitPriceAmount = domainItem.UnitPrice.Amount,
                UnitPriceCurrency = domainItem.UnitPrice.Currency
            });
        }
    }
}

// EF Core related types (from Microsoft.EntityFrameworkCore)
// These are usually available via using Microsoft.EntityFrameworkCore;
// For the sake of standalone compilation in a rule file, some stubs:
namespace Microsoft.EntityFrameworkCore
{
    public class DbContext { public DbContext(DbContextOptions options) {} public virtual Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) { return Task.FromResult(0); } public ChangeTracking.ChangeTracker ChangeTracker { get; } public Infrastructure.DatabaseFacade Database { get; } }
    public class DbContextOptions { }
    public class DbContextOptions<TContext> : DbContextOptions where TContext : DbContext { }
    public abstract class DbSet<TEntity> : IQueryable<TEntity> where TEntity : class
    {
        public abstract System.Linq.Expressions.Expression Expression { get; }
        public abstract IQueryProvider Provider { get; }
        public abstract System.Collections.Generic.IEnumerator<TEntity> GetEnumerator();
        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
        public virtual System.Threading.Tasks.ValueTask<Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<TEntity>> AddAsync(TEntity entity, CancellationToken cancellationToken = default) { return default; }
        public virtual void Update(TEntity entity) { }
    }
    public class ModelBuilder { public Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> Entity<TEntity>() where TEntity : class { return new Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity>(); } }

    namespace Metadata.Builders
    {
        public class EntityTypeBuilder<TEntity> where TEntity : class
        {
            public EntityTypeBuilder<TEntity> HasKey(System.Linq.Expressions.Expression<Func<TEntity, object>> keyExpression) { return this; }
            public PropertyBuilder<TProperty> Property<TProperty>(System.Linq.Expressions.Expression<Func<TEntity, TProperty>> propertyExpression) { return new PropertyBuilder<TProperty>(); }
            public OwnedNavigationBuilder<TEntity, TRelatedEntity> OwnsOne<TRelatedEntity>(System.Linq.Expressions.Expression<Func<TEntity, TRelatedEntity>> navigationExpression, Action<OwnedNavigationBuilder<TEntity, TRelatedEntity>> buildAction) where TRelatedEntity : class { return new OwnedNavigationBuilder<TEntity, TRelatedEntity>(); }
            public EntityTypeBuilder<TEntity> HasMany<TRelatedEntity>(System.Linq.Expressions.Expression<Func<TEntity, IEnumerable<TRelatedEntity>>> navigationExpression) where TRelatedEntity : class { return this; }
        }
        public class PropertyBuilder<TProperty>
        {
            public PropertyBuilder<TProperty> ValueGeneratedNever() { return this; }
            public PropertyBuilder<TProperty> HasColumnName(string name) { return this; }
            public PropertyBuilder<TProperty> IsRequired(bool required = true) { return this; }
            public PropertyBuilder<TProperty> HasMaxLength(int maxLength) { return this; }
        }
        public class OwnedNavigationBuilder<TEntity, TRelatedEntity> where TEntity : class where TRelatedEntity : class
        {
            public PropertyBuilder<TProperty> Property<TProperty>(System.Linq.Expressions.Expression<Func<TRelatedEntity, TProperty>> propertyExpression) { return new PropertyBuilder<TProperty>(); }
        }
    }
     namespace ChangeTracking { public class ChangeTracker { } public class EntityEntry<TEntity> where TEntity: class {} }
     namespace Infrastructure { public abstract class DatabaseFacade { public abstract bool EnsureCreated(); } }

    public static class RelationalQueryableExtensions
    {
        public static IQueryable<TEntity> Include<TEntity, TProperty>(this IQueryable<TEntity> source, System.Linq.Expressions.Expression<Func<TEntity, TProperty>> navigationPropertyPath) where TEntity : class { return source; }
    }
    public static class EntityFrameworkQueryableExtensions
    {
        public static Task<TSource> FirstOrDefaultAsync<TSource>(this System.Linq.IQueryable<TSource> source, System.Linq.Expressions.Expression<Func<TSource, bool>> predicate, CancellationToken cancellationToken = default) { return Task.FromResult(default(TSource)); }
        public static Task<List<TSource>> ToListAsync<TSource>(this System.Linq.IQueryable<TSource> source, CancellationToken cancellationToken = default) { return Task.FromResult(new List<TSource>()); }
    }
}

```

### ユニットオブワーク

- 複数のリポジトリにまたがるトランザクション管理
- グループ化された変更を一括でコミットまたはロールバック

```csharp
// ユニットオブワークの例
// IUnitOfWork interface is defined in CQRS section for simplicity
// public interface IUnitOfWork { Task SaveChangesAsync(CancellationToken cancellationToken = default); }

public class UnitOfWork : IUnitOfWork // Implements domain/application interface
{
    private readonly ApplicationDbContext _dbContext; // EF Core DbContext

    public UnitOfWork(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // This is where DbContext.SaveChangesAsync() is called.
        // Can also include dispatching domain events before saving if using an event dispatcher.
        // For example:
        // await _domainEventDispatcher.DispatchEventsAsync(_dbContext);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
```

### 依存性注入の設定

- 依存関係の明示的な宣言とライフタイム管理
- モジュール単位で依存関係を登録
- テスト容易性のため、常にインターフェースに対して依存する

```csharp
// 依存性注入の設定例 (ASP.NET Core Program.cs or Startup.cs)
// Requires Microsoft.Extensions.DependencyInjection nuget package
// Simplified stubs for Microsoft.Extensions.DependencyInjection
namespace Microsoft.Extensions.DependencyInjection
{
    public interface IServiceCollection
    {
        IServiceCollection AddScoped<TService, TImplementation>() where TService : class where TImplementation : class, TService;
        IServiceCollection AddTransient<TService, TImplementation>() where TService : class where TImplementation : class, TService;
        IServiceCollection AddSingleton<TService, TImplementation>() where TService : class where TImplementation : class, TService;
        IServiceCollection AddHttpClient<TClient, TImplementation>(Action<System.Net.Http.HttpClient> configureClient) where TClient : class where TImplementation : class, TClient;
        IServiceCollection AddDbContext<TContext>(Action<Microsoft.EntityFrameworkCore.DbContextOptionsBuilder> optionsAction, ServiceLifetime contextLifetime = ServiceLifetime.Scoped, ServiceLifetime optionsLifetime = ServiceLifetime.Scoped) where TContext : Microsoft.EntityFrameworkCore.DbContext;
    }
    public enum ServiceLifetime { Singleton, Scoped, Transient }
}
namespace Microsoft.Extensions.Configuration
{
    public interface IConfiguration { string GetConnectionString(string name); string this[string key] { get; } }
}
namespace Microsoft.EntityFrameworkCore // For DbContextOptionsBuilder
{
    public class DbContextOptionsBuilder { public virtual void UseSqlServer(string connectionString, Action<Microsoft.EntityFrameworkCore.Infrastructure.SqlServerDbContextOptionsBuilder> sqlServerOptionsAction = null) { } }
    namespace Infrastructure { public class SqlServerDbContextOptionsBuilder { } }
}


// Actual DI setup
public static class DependencyInjection
{
    public static Microsoft.Extensions.DependencyInjection.IServiceCollection AddInfrastructure(
        this Microsoft.Extensions.DependencyInjection.IServiceCollection services,
        Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        // データベース設定 (EF Core)
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        // リポジトリ登録 (Scoped lifetime is common for DbContext related services)
        services.AddScoped<ICustomerRepository, CustomerRepository>(); // Assuming CustomerRepository exists
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IProductRepository, ProductRepository>(); // Assuming ProductRepository exists

        // ユニットオブワーク
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // 外部サービス
        services.AddTransient<IEmailService, SmtpEmailService>(); // Transient or Scoped depending on SmtpEmailService needs
        services.AddHttpClient<IPaymentGateway, StripePaymentGateway>(client =>
        {
            client.BaseAddress = new Uri(configuration["PaymentGateway:BaseUrl"]);
            // Add other HttpClient configurations like headers, timeouts
        });

        return services;
    }

    public static Microsoft.Extensions.DependencyInjection.IServiceCollection AddApplication(
        this Microsoft.Extensions.DependencyInjection.IServiceCollection services)
    {
        // MediatR registration (actual registration depends on MediatR version, e.g., using Scrutor for older versions)
        // services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(CreateOrderCommand).Assembly));

        // FluentValidation validators
        // services.AddValidatorsFromAssembly(typeof(CreateOrderCommandValidator).Assembly, ServiceLifetime.Transient); // Or Scoped

        // MediatR Pipeline Behaviors
        // services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        // services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>)); // Example logging

        // Domain Services
        services.AddScoped<OrderPricingService>();
        services.AddScoped<IDiscountPolicy, DefaultDiscountPolicy>();

        // Mappers (e.g. AutoMapper)
        // services.AddAutoMapper(typeof(MappingProfile).Assembly);

        return services;
    }
}

// Placeholder for assumed types used in DI
public interface IEmailService { }
public class SmtpEmailService : IEmailService { }
public interface IPaymentGateway { }
public class StripePaymentGateway : IPaymentGateway { public StripePaymentGateway(System.Net.Http.HttpClient client) { } }
public interface ICustomerRepository { } // Defined elsewhere
public class CustomerRepository : ICustomerRepository { public CustomerRepository(ApplicationDbContext context) {} }
// ProductRepository and DefaultDiscountPolicy are defined in previous sections for example purposes
// public class ProductRepository : IProductRepository { public ProductRepository(ApplicationDbContext context) {} public Task<Product> GetByIdAsync(ProductId id) { return Task.FromResult(new Product()); } }
// public class DefaultDiscountPolicy : IDiscountPolicy { public Money CalculateDiscount(Order order, Money subtotal) => Money.Zero(subtotal.Currency); }

```

## テスト駆動開発とテスト戦略

### ユニットテスト

- ビジネスロジックをクラスレベルで単体テスト
- 外部依存はモックまたはスタブに置き換え
- テストは隔離された環境で実行可能にする
- AAA（Arrange-Act-Assert）パターンに従う

```csharp
// ユニットテストの例 (xUnit, Moq, FluentAssertions を使用)
// Requires xunit, moq, FluentAssertions nuget packages

// --- Stubs for testing frameworks for compilation ---
namespace Xunit
{
    public class FactAttribute : Attribute { }
}
namespace Moq
{
    public class Mock<T> where T : class
    {
        public T Object { get; }
        public Mock() { Object = default(T); } // Simplified
        public Language.ISetup<T> Setup(System.Linq.Expressions.Expression<Action<T>> expression) { return null; }
        public Language.ISetup<T, TResult> Setup<TResult>(System.Linq.Expressions.Expression<Func<T, TResult>> expression) { return null; }
        public void Verify(System.Linq.Expressions.Expression<Action<T>> expression, Times times) { }
        public void Verify<TResult>(System.Linq.Expressions.Expression<Func<T, TResult>> expression, Times times) { }
    }
    public enum Times { Once, Never, AtLeastOnce, Exactly(int callCount) }
    namespace Language { public interface ISetup<T> where T : class { } public interface ISetup<T, TResult> where T : class { void Returns(TResult value); void ReturnsAsync(TResult value); void Throws<TException>() where TException : Exception, new(); } }
    public static class It { public static TValue IsAny<TValue>() => default; public static TValue Is<TValue>(System.Linq.Expressions.Expression<Func<TValue, bool>> match) => default; }
}
namespace FluentAssertions
{
    public static class ObjectAssertionsExtensions { public static Primitives.ObjectAssertions Should(this object actualValue) => new Primitives.ObjectAssertions(actualValue); }
    public static class BooleanAssertionsExtensions { public static Primitives.BooleanAssertions Should(this bool actualValue) => new Primitives.BooleanAssertions(actualValue); }
    public static class GuidAssertionsExtensions { public static Primitives.GuidAssertions Should(this Guid actualValue) => new Primitives.GuidAssertions(actualValue); }
    namespace Primitives
    {
        public class ObjectAssertions { public ObjectAssertions(object value){} public void NotBeNull(string because = "", params object[] becauseArgs) { } public void BeNull(string because = "", params object[] becauseArgs) { } }
        public class BooleanAssertions { public BooleanAssertions(bool value){} public void BeTrue(string because = "", params object[] becauseArgs) { } public void BeFalse(string because = "", params object[] becauseArgs) { } }
        public class GuidAssertions { public GuidAssertions(Guid value){} public void NotBeEmpty(string because = "", params object[] becauseArgs) { } }
    }
}
// --- End Stubs ---


public class CreateOrderCommandHandlerTests
{
    private readonly Mock<IOrderRepository> _orderRepositoryMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly CreateOrderCommandHandler _handler;

    public CreateOrderCommandHandlerTests()
    {
        _orderRepositoryMock = new Mock<IOrderRepository>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();

        _handler = new CreateOrderCommandHandler(
            _orderRepositoryMock.Object,
            _unitOfWorkMock.Object
        );
    }

    [Xunit.Fact]
    public async Task Handle_WithValidCommand_ShouldCreateOrderAndSaveChanges()
    {
        // Arrange
        var command = new CreateOrderCommand
        (
            CustomerId: Guid.NewGuid(),
            Items: new List<OrderItemDto>
            {
                new() { ProductId = Guid.NewGuid(), Quantity = 2, UnitPrice = 10.99m, Currency = "USD" }
            }
        );

        _orderRepositoryMock
            .Setup(r => r.AddAsync(Moq.It.IsAny<Order>(), Moq.It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _unitOfWorkMock
            .Setup(u => u.SaveChangesAsync(Moq.It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        ((Result<Guid>)result).Value.Should().NotBeEmpty();

        _orderRepositoryMock.Verify(
            r => r.AddAsync(Moq.It.Is<Order>(o =>
                o.CustomerId.Value == command.CustomerId &&
                o.Items.Count == 1 &&
                o.Items.First().ProductId.Value == command.Items.First().ProductId &&
                o.Items.First().Quantity == command.Items.First().Quantity
            ), Moq.It.IsAny<CancellationToken>()),
            Moq.Times.Once()
        );

        _unitOfWorkMock.Verify(
            u => u.SaveChangesAsync(Moq.It.IsAny<CancellationToken>()),
            Moq.Times.Once()
        );
    }

    [Xunit.Fact]
    public async Task Handle_WhenOrderRepositoryThrowsException_ShouldReturnFailureAndNotSaveChanges()
    {
        // Arrange
        var command = new CreateOrderCommand
        (
             CustomerId: Guid.NewGuid(),
             Items: new List<OrderItemDto> { new() { ProductId = Guid.NewGuid(), Quantity = 1, UnitPrice = 10m, Currency = "USD" }}
        );

        _orderRepositoryMock
            .Setup(r => r.AddAsync(Moq.It.IsAny<Order>(), Moq.It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database error")); // Simulate DB error

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error.Should().NotBeNull();
        result.Error.Code.Should().Be("Order.Creation.Failed");
        result.Error.Message.Should().Contain("Database error");

        _unitOfWorkMock.Verify( // SaveChanges should not be called if AddAsync failed
            u => u.SaveChangesAsync(Moq.It.IsAny<CancellationToken>()),
            Moq.Times.Never()
        );
    }
}
```

### 統合テスト

- 複数のコンポーネント間の相互作用をテスト
- データベースや外部サービスとの連携部分をテスト
- テスト用のデータベースやモックサービスを使用する
- アプリケーションの主要なユースケースをカバーする

```csharp
// 統合テストの例 (ASP.NET Core WebApplicationFactory, Testcontainers を使用した例)
// Requires Microsoft.AspNetCore.Mvc.Testing, Testcontainers.PostgreSql (or other db)

// --- Stubs for Testcontainers and WebApplicationFactory ---
namespace Microsoft.AspNetCore.Mvc.Testing
{
    public class WebApplicationFactory<TEntryPoint> : IDisposable where TEntryPoint : class
    {
        public System.Net.Http.HttpClient CreateClient() => new System.Net.Http.HttpClient();
        public IServiceProvider Services => null;
        public virtual void Dispose() { }
        protected virtual void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) { }
    }
}
namespace Microsoft.AspNetCore.Hosting { public interface IWebHostBuilder { Microsoft.AspNetCore.Hosting.IWebHostBuilder ConfigureServices(Action<Microsoft.Extensions.DependencyInjection.IServiceCollection> configureServices); Microsoft.AspNetCore.Hosting.IWebHostBuilder UseEnvironment(string environment); } }
namespace Microsoft.Extensions.DependencyInjection { public static class ServiceCollectionDescriptorExtensions { public static Microsoft.Extensions.DependencyInjection.IServiceCollection RemoveAll<TService>(this Microsoft.Extensions.DependencyInjection.IServiceCollection services) { return services; } } } // Simplified
namespace DotNet.Testcontainers.Builders { public class TestcontainersBuilder<TDotNetEnvironmentContainer> where TDotNetEnvironmentContainer : DotNet.Testcontainers.Containers.IDockerContainer { public TDotNetEnvironmentContainer Build() => default; } public class PostgreSqlBuilder : TestcontainersBuilder<DotNet.Testcontainers.Containers.PostgreSqlContainer> { public PostgreSqlBuilder WithDatabase(string db) => this; public PostgreSqlBuilder WithUsername(string user) => this; public PostgreSqlBuilder WithPassword(string pw) => this; public new DotNet.Testcontainers.Containers.PostgreSqlContainer Build() => new DotNet.Testcontainers.Containers.PostgreSqlContainer(); } }
namespace DotNet.Testcontainers.Containers { public interface IDockerContainer : IAsyncDisposable { Task StartAsync(CancellationToken ct = default); Task StopAsync(CancellationToken ct = default); } public class PostgreSqlContainer : IDockerContainer { public string GetConnectionString() => ""; public Task StartAsync(CancellationToken ct = default) => Task.CompletedTask; public Task StopAsync(CancellationToken ct = default) => Task.CompletedTask; public ValueTask DisposeAsync() => ValueTask.CompletedTask; } }
// For Xunit.IClassFixture
namespace Xunit { public interface IClassFixture<TFixture> where TFixture : class { } }
// --- End Stubs ---

// Assume Program.cs or a similar entry point for the API project
// public class Program { }

public class CustomWebApplicationFactory<TStartup> : WebApplicationFactory<TStartup> where TStartup : class
{
    // private readonly DotNet.Testcontainers.Containers.PostgreSqlContainer _dbContainer;

    public CustomWebApplicationFactory()
    {
        // _dbContainer = new DotNet.Testcontainers.Builders.PostgreSqlBuilder()
        //     .WithDatabase("testdb")
        //     .WithUsername("testuser")
        //     .WithPassword("testpass")
        //     .Build();
    }

    // protected override void ConfigureWebHost(IWebHostBuilder builder)
    // {
    //     // _dbContainer.StartAsync().GetAwaiter().GetResult();

    //     builder.UseEnvironment("Test"); // Use a specific environment for tests
    //     builder.ConfigureServices(services =>
    //     {
    //         // Remove the app's ApplicationDbContext registration.
    //         services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
    //         services.RemoveAll<ApplicationDbContext>();

    //         // Add ApplicationDbContext using test database connection.
    //         services.AddDbContext<ApplicationDbContext>(options =>
    //         {
    //             // options.UseNpgsql(_dbContainer.GetConnectionString());
    //             options.UseInMemoryDatabase("TestDb_Integration"); // Easier alternative for some tests
    //         });

    //         // Ensure the database is created (for in-memory or if schema needs applying)
    //         var sp = services.BuildServiceProvider();
    //         using var scope = sp.CreateScope();
    //         var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    //         db.Database.EnsureCreated(); // For in-memory, creates schema based on model
    //     });
    // }

    // public new async Task DisposeAsync() // Match IAsyncDisposable if factory implements it
    // {
    //     // await _dbContainer.StopAsync();
    //     // await _dbContainer.DisposeAsync();
    //     // base.Dispose(); // Call base dispose if it's synchronous
    // }
}

// public class OrderEndpointsIntegrationTests : IClassFixture<CustomWebApplicationFactory<Program>>
// {
//     private readonly System.Net.Http.HttpClient _client;
//     private readonly CustomWebApplicationFactory<Program> _factory;

//     public OrderEndpointsIntegrationTests(CustomWebApplicationFactory<Program> factory)
//     {
//         _factory = factory;
//         _client = _factory.CreateClient();
//     }

//     [Xunit.Fact]
//     public async Task CreateOrder_WithValidData_ReturnsCreatedAndOrderId()
//     {
//         // Arrange
//         var request = new CreateOrderApiRequest // Matches API request model
//         {
//             CustomerId = Guid.NewGuid(),
//             Items = new List<OrderItemDto> // Use the DTO from Application layer
//             {
//                 new() { ProductId = Guid.NewGuid(), Quantity = 1, UnitPrice = 100, Currency = "USD" }
//             }
//         };
//         var jsonRequest = System.Text.Json.JsonSerializer.Serialize(request);
//         var content = new System.Net.Http.StringContent(jsonRequest, System.Text.Encoding.UTF8, "application/json");

//         // Act
//         var response = await _client.PostAsync("/api/orders", content); // Assuming this is the endpoint

//         // Assert
//         response.EnsureSuccessStatusCode(); // Status Code 200-299
//         response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);

//         var responseString = await response.Content.ReadAsStringAsync();
//         // Assuming the API returns a simple object with orderId
//         var createdResponse = System.Text.Json.JsonSerializer.Deserialize<CreateOrderApiResponse>(responseString,
//             new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

//         createdResponse.OrderId.Should().NotBeEmpty();

//         // Optionally, verify data in the test database
//         using var scope = _factory.Services.CreateScope(); // Requires _factory.Services to be accessible
//         var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
//         var orderInDb = await dbContext.Orders.FindAsync(createdResponse.OrderId);
//         orderInDb.Should().NotBeNull();
//         orderInDb.CustomerIdValue.Value.Should().Be(request.CustomerId);
//     }
// }
// public class CreateOrderApiResponse { public Guid OrderId { get; set; } } // Example API response DTO

```

### エンドツーエンド(E2E)テスト

- ユーザーの視点からシステム全体をテスト
- UI操作をシミュレート（例: Selenium, Playwright）
- APIレベルでのE2Eテストも有効
- 主要なユーザーストーリーや業務フローを検証する

```csharp
// E2Eテストの概念 (Playwright を使用した例 - コードは擬似的)
// Requires Microsoft.Playwright nuget package

// --- Stubs for Playwright ---
namespace Microsoft.Playwright
{
    public interface IPlaywright : IDisposable { IBrowserType Chromium { get; } }
    public static class Playwright { public static Task<IPlaywright> CreateAsync() => Task.FromResult<IPlaywright>(null); }
    public interface IBrowserType { Task<IBrowser> LaunchAsync(BrowserTypeLaunchOptions options = null); }
    public class BrowserTypeLaunchOptions { public bool Headless { get; set; } public System.Collections.Generic.IList<string> Args { get; set; } }
    public interface IBrowser : IAsyncDisposable { Task<IPage> NewPageAsync(BrowserNewPageOptions options = null); Task CloseAsync(); }
    public class BrowserNewPageOptions { }
    public interface IPage : IAsyncDisposable
    {
        Task GotoAsync(string url, PageGotoOptions options = null);
        Task ClickAsync(string selector, PageClickOptions options = null);
        Task FillAsync(string selector, string value, PageFillOptions options = null);
        Task<string> TextContentAsync(string selector, PageTextContentOptions options = null);
        Task<IElementHandle> QuerySelectorAsync(string selector);
        Task WaitForSelectorAsync(string selector, PageWaitForSelectorOptions options = null);
    }
    public class PageGotoOptions { public WaitUntilState? WaitUntil { get; set; } } public enum WaitUntilState { }
    public class PageClickOptions { }
    public class PageFillOptions { }
    public class PageTextContentOptions { }
    public class PageWaitForSelectorOptions { public ElementState? State { get; set; } } public enum ElementState { }
    public interface IElementHandle { Task<string> TextContentAsync(); }
}
// --- End Stubs ---


// public class OrderPlacementE2ETests : Xunit.IAsyncLifetime // For setup/teardown per test class
// {
//     private Microsoft.Playwright.IPlaywright _playwright;
//     private Microsoft.Playwright.IBrowser _browser;
//     private Microsoft.Playwright.IPage _page;
//     private const string AppBaseUrl = "http://localhost:5000"; // Your app's running URL

//     public async Task InitializeAsync()
//     {
//         _playwright = await Microsoft.Playwright.Playwright.CreateAsync();
//         _browser = await _playwright.Chromium.LaunchAsync(new Microsoft.Playwright.BrowserTypeLaunchOptions
//         {
//             Headless = true // Set to false to watch the browser
//             // Args = new[] { "--start-maximized" } // Example argument
//         });
//         _page = await _browser.NewPageAsync();
//     }

//     public async Task DisposeAsync()
//     {
//         await _browser.CloseAsync();
//         _playwright.Dispose();
//     }

//     [Xunit.Fact]
//     public async Task UserCanNavigateToHomePageAndSeeTitle()
//     {
//         await _page.GotoAsync(AppBaseUrl);
//         var title = await _page.TitleAsync(); // Assuming IPage has TitleAsync
//         title.Should().Contain("Your App Name"); // Replace with actual title part
//     }

//     [Xunit.Fact]
//     public async Task UserCanPlaceOrderSuccessfully_Scenario()
//     {
//         // Arrange: Navigate to the application's home page or product page
//         await _page.GotoAsync(AppBaseUrl + "/products");

//         // Act: Simulate user actions
//         // 1. Add item to cart
//         await _page.ClickAsync(".product-item[data-product-id='123'] .add-to-cart-button");
//         await _page.WaitForSelectorAsync(".cart-item-count:text('1')"); // Wait for cart to update

//         // 2. Go to cart
//         await _page.ClickAsync("#view-cart-link");
//         await _page.WaitForSelectorAsync("h1:text('Shopping Cart')");

//         // 3. Proceed to checkout
//         await _page.ClickAsync("#proceed-to-checkout-button");
//         await _page.WaitForSelectorAsync("h1:text('Checkout')");

//         // 4. Fill in checkout form
//         await _page.FillAsync("#email", "e2e.testuser@example.com");
//         await _page.FillAsync("#shipping-address-line1", "123 E2E Street");
//         await _page.FillAsync("#shipping-city", "Testville");
//         // ... fill other required form fields ...

//         // 5. Place order
//         await _page.ClickAsync("#confirm-order-button");

//         // Assert: Verify order confirmation
//         await _page.WaitForSelectorAsync("#order-confirmation-page", new Microsoft.Playwright.PageWaitForSelectorOptions { State = Microsoft.Playwright.ElementState.Visible });
//         var confirmationMessage = await _page.TextContentAsync("#order-summary .status-message");
//         confirmationMessage.Should().Contain("Your order has been placed successfully!");

//         var orderIdElement = await _page.QuerySelectorAsync("#order-summary .order-id-value");
//         var orderIdText = await orderIdElement.TextContentAsync();
//         Guid.TryParse(orderIdText, out _).Should().BeTrue("Order ID should be a valid GUID.");
//     }
// }
// Add to IPage interface for Playwright stubs:
// namespace Microsoft.Playwright { public interface IPage { Task<string> TitleAsync(); } }
```

## 全般的なガイドライン

- **コメント**:複雑なロジックや「なぜ」そうしたのかを説明するためにコメントを使用する。「何」をしているかはコードで明確に表現する。
- **エラー処理**: Resultパターンを優先し、例外は真に予期しない状況のために使用する。エラーメッセージはユーザーフレンドリーかつ開発者にも役立つ情報を含むべき。
- **非同期処理**: `async/await` を適切に使用し、ブロッキング呼び出しを避ける。`ConfigureAwait(false)` をライブラリコードで使用する。
- **LINQ**: 可読性を損なわない範囲でLINQを活用する。複雑なクエリはメソッドに分割するか、より明示的なループを使用する。遅延実行に注意する。
- **セキュリティ**: SQLインジェクション、XSS、CSRFなどの一般的な脆弱性対策を常に意識する。入力検証は必須。機密情報は適切に保護する。
- **コードレビュー**: すべてのコードはマージ前にチームメンバーによるレビューを受けるべき。建設的なフィードバックを奨励する文化を育む。
- **静的解析**: StyleCop、Roslyn Analyzerなどの静的解析ツールを導入し、早期に問題を検出する。
- **ログ**: 構造化ログ（Serilogなど）を使用し、診断やデバッグに役立つ情報を記録する。個人情報や機密情報のログ記録には注意する。
