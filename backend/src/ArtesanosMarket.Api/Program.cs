using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("ArtesanosMarketDb"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("Frontend");
app.UseSwagger();
app.UseSwaggerUI();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(db);
}

app.MapGet("/", () => Results.Ok(new { app = "Artesanos Market API", status = "OK" }));

app.MapPost("/api/auth/register", async (RegisterRequest request, AppDbContext db) =>
{
    if (await db.Users.AnyAsync(x => x.Email == request.Email))
        return Results.BadRequest(new { message = "El correo ya está registrado." });

    var role = await db.Roles.FirstOrDefaultAsync(x => x.Name == request.Role)
        ?? await db.Roles.FirstAsync(x => x.Name == "Cliente");

    var user = new User
    {
        FullName = request.FullName,
        Email = request.Email,
        PasswordHash = PasswordHasher.Hash(request.Password),
        RoleId = role.Id,
        IsActive = true
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created($"/api/users/{user.Id}", new UserDto(user.Id, user.FullName, user.Email, role.Name));
});

app.MapPost("/api/auth/login", async (LoginRequest request, AppDbContext db) =>
{
    var user = await db.Users.Include(x => x.Role).FirstOrDefaultAsync(x => x.Email == request.Email && x.IsActive);
    if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        return Results.Unauthorized();

    return Results.Ok(new LoginResponse("demo-token", new UserDto(user.Id, user.FullName, user.Email, user.Role.Name)));
});

app.MapGet("/api/products", async (AppDbContext db, string? search, int? categoryId) =>
{
    var query = db.Products.Include(x => x.Category).Where(x => x.IsActive).AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
        query = query.Where(x => x.Name.Contains(search) || x.Description.Contains(search));

    if (categoryId.HasValue)
        query = query.Where(x => x.CategoryId == categoryId.Value);

    var products = await query.Select(x => new ProductDto(x.Id, x.Name, x.Description, x.Price, x.Stock, x.ImageUrl, x.Category.Name, x.SellerId)).ToListAsync();
    return Results.Ok(products);
});

app.MapGet("/api/products/{id:int}", async (int id, AppDbContext db) =>
{
    var product = await db.Products.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
    return product is null
        ? Results.NotFound()
        : Results.Ok(new ProductDto(product.Id, product.Name, product.Description, product.Price, product.Stock, product.ImageUrl, product.Category.Name, product.SellerId));
});

app.MapPost("/api/products", async (ProductCreateRequest request, AppDbContext db) =>
{
    var product = new Product
    {
        Name = request.Name,
        Description = request.Description,
        Price = request.Price,
        Stock = request.Stock,
        ImageUrl = request.ImageUrl,
        CategoryId = request.CategoryId,
        SellerId = request.SellerId,
        IsActive = true
    };

    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/api/products/{product.Id}", product);
});

app.MapGet("/api/cart/{userId:int}", async (int userId, AppDbContext db) =>
{
    var cart = await db.Carts.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.UserId == userId && x.Status == "Activo");
    return Results.Ok(CartDto.From(cart));
});

app.MapPost("/api/cart/items", async (AddCartItemRequest request, AppDbContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(x => x.Id == request.ProductId && x.IsActive);
    if (product is null) return Results.NotFound(new { message = "Producto no encontrado." });
    if (request.Quantity <= 0) return Results.BadRequest(new { message = "La cantidad debe ser mayor a cero." });

    var cart = await db.Carts.Include(x => x.Items).FirstOrDefaultAsync(x => x.UserId == request.UserId && x.Status == "Activo");
    if (cart is null)
    {
        cart = new Cart { UserId = request.UserId, Status = "Activo" };
        db.Carts.Add(cart);
    }

    var item = cart.Items.FirstOrDefault(x => x.ProductId == request.ProductId);
    if (item is null)
        cart.Items.Add(new CartItem { ProductId = request.ProductId, Quantity = request.Quantity, UnitPrice = product.Price });
    else
        item.Quantity += request.Quantity;

    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Producto agregado al carrito." });
});

app.MapPost("/api/orders/checkout", async (CheckoutRequest request, AppDbContext db) =>
{
    var cart = await db.Carts.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.UserId == request.UserId && x.Status == "Activo");
    if (cart is null || cart.Items.Count == 0) return Results.BadRequest(new { message = "El carrito está vacío." });

    var order = new Order
    {
        UserId = request.UserId,
        ShippingAddress = request.ShippingAddress,
        Status = "Confirmado",
        Total = cart.Items.Sum(x => x.Quantity * x.UnitPrice),
        CreatedAt = DateTime.UtcNow,
        Items = cart.Items.Select(x => new OrderItem { ProductId = x.ProductId, Quantity = x.Quantity, UnitPrice = x.UnitPrice }).ToList(),
        Payment = new Payment { Method = request.PaymentMethod, Status = "Aprobado", AuthorizationCode = $"MOCK-{DateTime.UtcNow:yyyyMMddHHmmss}" }
    };

    cart.Status = "Convertido";
    db.Orders.Add(order);
    await db.SaveChangesAsync();

    return Results.Ok(new { order.Id, order.Status, order.Total, paymentStatus = order.Payment.Status });
});

app.MapGet("/api/orders/user/{userId:int}", async (int userId, AppDbContext db) =>
{
    var orders = await db.Orders.Include(x => x.Items).Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).ToListAsync();
    return Results.Ok(orders.Select(OrderDto.From));
});

app.MapGet("/api/orders/seller/{sellerId:int}", async (int sellerId, AppDbContext db) =>
{
    var orders = await db.Orders.Include(x => x.Items).ThenInclude(x => x.Product)
        .Where(x => x.Items.Any(i => i.Product.SellerId == sellerId)).OrderByDescending(x => x.CreatedAt).ToListAsync();
    return Results.Ok(orders.Select(OrderDto.From));
});

app.MapPut("/api/orders/{orderId:int}/status", async (int orderId, UpdateOrderStatusRequest request, AppDbContext db) =>
{
    var order = await db.Orders.FirstOrDefaultAsync(x => x.Id == orderId);
    if (order is null) return Results.NotFound();

    order.Status = request.Status;
    await db.SaveChangesAsync();
    return Results.Ok(new { order.Id, order.Status });
});

app.Run();

public partial class Program { }

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
}

public class Role { public int Id { get; set; } public string Name { get; set; } = string.Empty; }
public class User { public int Id { get; set; } public string FullName { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public string PasswordHash { get; set; } = string.Empty; public bool IsActive { get; set; } = true; public int RoleId { get; set; } public Role Role { get; set; } = null!; }
public class Category { public int Id { get; set; } public string Name { get; set; } = string.Empty; }
public class Product { public int Id { get; set; } public string Name { get; set; } = string.Empty; public string Description { get; set; } = string.Empty; public decimal Price { get; set; } public int Stock { get; set; } public string ImageUrl { get; set; } = string.Empty; public bool IsActive { get; set; } = true; public int CategoryId { get; set; } public Category Category { get; set; } = null!; public int SellerId { get; set; } }
public class Cart { public int Id { get; set; } public int UserId { get; set; } public string Status { get; set; } = "Activo"; public List<CartItem> Items { get; set; } = []; }
public class CartItem { public int Id { get; set; } public int CartId { get; set; } public int ProductId { get; set; } public Product Product { get; set; } = null!; public int Quantity { get; set; } public decimal UnitPrice { get; set; } }
public class Order { public int Id { get; set; } public int UserId { get; set; } public DateTime CreatedAt { get; set; } public string ShippingAddress { get; set; } = string.Empty; public string Status { get; set; } = "Pendiente"; public decimal Total { get; set; } public List<OrderItem> Items { get; set; } = []; public Payment Payment { get; set; } = null!; }
public class OrderItem { public int Id { get; set; } public int OrderId { get; set; } public int ProductId { get; set; } public Product Product { get; set; } = null!; public int Quantity { get; set; } public decimal UnitPrice { get; set; } }
public class Payment { public int Id { get; set; } public int OrderId { get; set; } public string Method { get; set; } = "Mock"; public string Status { get; set; } = "Pendiente"; public string AuthorizationCode { get; set; } = string.Empty; }

public record RegisterRequest([Required] string FullName, [Required] string Email, [Required] string Password, string Role = "Cliente");
public record LoginRequest([Required] string Email, [Required] string Password);
public record ProductCreateRequest(string Name, string Description, decimal Price, int Stock, string ImageUrl, int CategoryId, int SellerId);
public record AddCartItemRequest(int UserId, int ProductId, int Quantity);
public record CheckoutRequest(int UserId, string ShippingAddress, string PaymentMethod);
public record UpdateOrderStatusRequest(string Status);
public record UserDto(int Id, string FullName, string Email, string Role);
public record LoginResponse(string Token, UserDto User);
public record ProductDto(int Id, string Name, string Description, decimal Price, int Stock, string ImageUrl, string Category, int SellerId);
public record CartDto(int Id, int UserId, List<CartItemDto> Items, decimal Total)
{
    public static CartDto From(Cart? cart) => cart is null
        ? new CartDto(0, 0, [], 0)
        : new CartDto(cart.Id, cart.UserId, cart.Items.Select(x => new CartItemDto(x.ProductId, x.Product.Name, x.Quantity, x.UnitPrice, x.Quantity * x.UnitPrice)).ToList(), cart.Items.Sum(x => x.Quantity * x.UnitPrice));
}
public record CartItemDto(int ProductId, string ProductName, int Quantity, decimal UnitPrice, decimal Subtotal);
public record OrderDto(int Id, int UserId, string Status, decimal Total, DateTime CreatedAt)
{
    public static OrderDto From(Order order) => new(order.Id, order.UserId, order.Status, order.Total, order.CreatedAt);
}

public static class PasswordHasher
{
    public static string Hash(string password) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(password));
    public static bool Verify(string password, string hash) => Hash(password) == hash;
}

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (db.Roles.Any()) return;
        var cliente = new Role { Name = "Cliente" };
        var vendedor = new Role { Name = "Vendedor" };
        db.Roles.AddRange(cliente, vendedor, new Role { Name = "Administrador" });
        db.Categories.AddRange(new Category { Name = "Textiles" }, new Category { Name = "Cerámica" }, new Category { Name = "Madera" });
        db.SaveChanges();
        db.Users.AddRange(
            new User { FullName = "Cliente Demo", Email = "cliente@demo.com", PasswordHash = PasswordHasher.Hash("Demo123"), RoleId = cliente.Id },
            new User { FullName = "Vendedor Demo", Email = "vendedor@demo.com", PasswordHash = PasswordHasher.Hash("Demo123"), RoleId = vendedor.Id }
        );
        db.SaveChanges();
        db.Products.AddRange(
            new Product { Name = "Huipil artesanal", Description = "Textil guatemalteco hecho a mano.", Price = 350, Stock = 5, ImageUrl = "https://placehold.co/600x400", CategoryId = 1, SellerId = 2 },
            new Product { Name = "Taza de cerámica", Description = "Pieza de cerámica local.", Price = 85, Stock = 12, ImageUrl = "https://placehold.co/600x400", CategoryId = 2, SellerId = 2 }
        );
        db.SaveChanges();
    }
}
