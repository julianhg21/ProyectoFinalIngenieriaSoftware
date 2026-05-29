using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("ArtesanosMarketDb"));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
var app = builder.Build();
app.UseCors("Frontend");
app.UseSwagger();
app.UseSwaggerUI();
using (var scope = app.Services.CreateScope()) Seed(scope.ServiceProvider.GetRequiredService<AppDbContext>());
app.MapExtraEndpoints();

app.MapGet("/", () => Results.Ok(new { app = "Artesanos Market API", status = "OK" }));
app.MapGet("/api/categories", async (AppDbContext db) => Results.Ok(await db.Categories.OrderBy(x => x.Name).ToListAsync()));

app.MapPost("/api/auth/register", async (RegisterRequest r, AppDbContext db) =>
{
    if (await db.Users.AnyAsync(x => x.Email == r.Email)) return Results.BadRequest(new { message = "El correo ya existe." });
    var role = await db.Roles.FirstOrDefaultAsync(x => x.Name == r.Role) ?? await db.Roles.FirstAsync(x => x.Name == "Cliente");
    var user = new User { FullName = r.FullName, Email = r.Email, KeyValue = Enc(r.Password), RoleId = role.Id, IsActive = true };
    db.Users.Add(user); await db.SaveChangesAsync();
    return Results.Created("/api/users/" + user.Id, new UserDto(user.Id, user.FullName, user.Email, role.Name, user.IsActive));
});

app.MapPost("/api/auth/login", async (LoginRequest r, AppDbContext db) =>
{
    var user = await db.Users.Include(x => x.Role).FirstOrDefaultAsync(x => x.Email == r.Email && x.IsActive);
    if (user is null || user.KeyValue != Enc(r.Password)) return Results.Unauthorized();
    return Results.Ok(new LoginResponse("demo-token", new UserDto(user.Id, user.FullName, user.Email, user.Role.Name, user.IsActive)));
});

app.MapGet("/api/products", async (AppDbContext db, string? search, int? categoryId, bool includeInactive = false) =>
{
    var q = db.Products.Include(x => x.Category).AsQueryable();
    if (!includeInactive) q = q.Where(x => x.IsActive);
    if (!string.IsNullOrWhiteSpace(search)) q = q.Where(x => x.Name.Contains(search) || x.Description.Contains(search));
    if (categoryId.HasValue && categoryId.Value > 0) q = q.Where(x => x.CategoryId == categoryId.Value);
    return Results.Ok(await q.OrderBy(x => x.Name).Select(x => new ProductDto(x.Id, x.Name, x.Description, x.Price, x.Stock, x.ImageUrl, x.Category.Name, x.CategoryId, x.SellerId, x.IsActive)).ToListAsync());
});

app.MapGet("/api/products/seller/{sellerId:int}", async (int sellerId, AppDbContext db) =>
    Results.Ok(await db.Products.Include(x => x.Category).Where(x => x.SellerId == sellerId).OrderBy(x => x.Name).Select(x => new ProductDto(x.Id, x.Name, x.Description, x.Price, x.Stock, x.ImageUrl, x.Category.Name, x.CategoryId, x.SellerId, x.IsActive)).ToListAsync()));

app.MapPost("/api/products", async (ProductWriteRequest r, AppDbContext db) =>
{
    var product = new Product { Name = r.Name, Description = r.Description, Price = r.Price, Stock = r.Stock, ImageUrl = string.IsNullOrWhiteSpace(r.ImageUrl) ? "https://placehold.co/600x400" : r.ImageUrl, CategoryId = r.CategoryId, SellerId = r.SellerId, IsActive = true };
    db.Products.Add(product); await db.SaveChangesAsync(); return Results.Created("/api/products/" + product.Id, product);
});

app.MapPut("/api/products/{id:int}", async (int id, ProductWriteRequest r, AppDbContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(x => x.Id == id); if (product is null) return Results.NotFound();
    product.Name = r.Name; product.Description = r.Description; product.Price = r.Price; product.Stock = r.Stock; product.ImageUrl = r.ImageUrl; product.CategoryId = r.CategoryId; product.IsActive = r.IsActive;
    await db.SaveChangesAsync(); return Results.Ok(product);
});

app.MapPut("/api/products/{id:int}/status", async (int id, StatusRequest r, AppDbContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(x => x.Id == id); if (product is null) return Results.NotFound();
    product.IsActive = r.IsActive; await db.SaveChangesAsync(); return Results.Ok(new { product.Id, product.IsActive });
});

app.MapGet("/api/cart/{userId:int}", async (int userId, AppDbContext db) =>
{
    var cart = await db.Carts.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.UserId == userId && x.Status == "Activo");
    return Results.Ok(CartDto.From(cart));
});

app.MapPost("/api/cart/items", async (AddCartItemRequest r, AppDbContext db) =>
{
    var product = await db.Products.FirstOrDefaultAsync(x => x.Id == r.ProductId && x.IsActive); if (product is null) return Results.NotFound();
    var cart = await db.Carts.Include(x => x.Items).FirstOrDefaultAsync(x => x.UserId == r.UserId && x.Status == "Activo");
    if (cart is null) { cart = new Cart { UserId = r.UserId, Status = "Activo" }; db.Carts.Add(cart); }
    var item = cart.Items.FirstOrDefault(x => x.ProductId == r.ProductId);
    if (item is null) cart.Items.Add(new CartItem { ProductId = r.ProductId, Quantity = r.Quantity, UnitPrice = product.Price }); else item.Quantity += r.Quantity;
    await db.SaveChangesAsync(); return Results.Ok(new { message = "Producto agregado." });
});

app.MapPost("/api/orders/checkout", async (CheckoutRequest r, AppDbContext db) =>
{
    var cart = await db.Carts.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.UserId == r.UserId && x.Status == "Activo");
    if (cart is null || cart.Items.Count == 0) return Results.BadRequest(new { message = "El carrito está vacío." });
    var order = new Order { UserId = r.UserId, ShippingAddress = r.ShippingAddress, Status = "Confirmado", CreatedAt = DateTime.UtcNow, Total = cart.Items.Sum(x => x.Quantity * x.UnitPrice), Items = cart.Items.Select(x => new OrderItem { ProductId = x.ProductId, Quantity = x.Quantity, UnitPrice = x.UnitPrice }).ToList(), Payment = new Payment { Method = r.PaymentMethod, Status = "Aprobado", AuthorizationCode = "MOCK" } };
    foreach (var item in cart.Items) item.Product.Stock = Math.Max(0, item.Product.Stock - item.Quantity);
    cart.Status = "Convertido"; db.Orders.Add(order); await db.SaveChangesAsync(); return Results.Ok(new { order.Id, order.Status, order.Total, paymentStatus = order.Payment.Status });
});

app.MapGet("/api/orders/user/{userId:int}", async (int userId, AppDbContext db) => Results.Ok((await db.Orders.Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).ToListAsync()).Select(ToOrderDto)));
app.MapGet("/api/orders/seller/{sellerId:int}", async (int sellerId, AppDbContext db) => Results.Ok((await db.Orders.Include(x => x.Items).ThenInclude(x => x.Product).Where(x => x.Items.Any(i => i.Product.SellerId == sellerId)).OrderByDescending(x => x.CreatedAt).ToListAsync()).Select(ToOrderDto)));
app.MapPut("/api/orders/{id:int}/status", async (int id, OrderStatusRequest r, AppDbContext db) => { var o = await db.Orders.FindAsync(id); if (o is null) return Results.NotFound(); o.Status = r.Status; await db.SaveChangesAsync(); return Results.Ok(ToOrderDto(o)); });

app.MapGet("/api/admin/users", async (AppDbContext db) => Results.Ok(await db.Users.Include(x => x.Role).OrderBy(x => x.FullName).Select(x => new UserDto(x.Id, x.FullName, x.Email, x.Role.Name, x.IsActive)).ToListAsync()));
app.MapPut("/api/admin/users/{id:int}/status", async (int id, StatusRequest r, AppDbContext db) => { var u = await db.Users.FindAsync(id); if (u is null) return Results.NotFound(); u.IsActive = r.IsActive; await db.SaveChangesAsync(); return Results.Ok(new { u.Id, u.IsActive }); });
app.MapGet("/api/admin/report", async (AppDbContext db) => Results.Ok(new ReportDto(await db.Orders.SumAsync(x => x.Total), await db.Orders.CountAsync(), await db.Users.CountAsync(), await db.Products.CountAsync())));

app.Run();

static string Enc(string value) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(value));
static OrderDto ToOrderDto(Order x) => new(x.Id, x.UserId, x.Status, x.Total, x.CreatedAt);
static void Seed(AppDbContext db)
{
    if (db.Roles.Any()) return;
    var c = new Role { Name = "Cliente" }; var v = new Role { Name = "Vendedor" }; var a = new Role { Name = "Administrador" };
    db.Roles.AddRange(c, v, a); db.Categories.AddRange(new Category { Name = "Textiles" }, new Category { Name = "Cerámica" }, new Category { Name = "Madera" }, new Category { Name = "Joyería" }); db.SaveChanges();
    db.Users.AddRange(new User { FullName = "Cliente Demo", Email = "cliente@demo.com", KeyValue = Enc("Demo123"), RoleId = c.Id }, new User { FullName = "Vendedor Demo", Email = "vendedor@demo.com", KeyValue = Enc("Demo123"), RoleId = v.Id }, new User { FullName = "Administrador Demo", Email = "admin@demo.com", KeyValue = Enc("Demo123"), RoleId = a.Id }); db.SaveChanges();
    db.Products.AddRange(new Product { Name = "Huipil artesanal", Description = "Textil guatemalteco hecho a mano.", Price = 350, Stock = 5, ImageUrl = "https://placehold.co/600x400", CategoryId = 1, SellerId = 2 }, new Product { Name = "Taza de cerámica", Description = "Pieza de cerámica local.", Price = 85, Stock = 12, ImageUrl = "https://placehold.co/600x400", CategoryId = 2, SellerId = 2 }, new Product { Name = "Caja de madera", Description = "Caja decorativa tallada a mano.", Price = 145, Stock = 8, ImageUrl = "https://placehold.co/600x400", CategoryId = 3, SellerId = 2 }, new Product { Name = "Pulsera artesanal", Description = "Pulsera elaborada por productores locales.", Price = 45, Stock = 20, ImageUrl = "https://placehold.co/600x400", CategoryId = 4, SellerId = 2 }); db.SaveChanges();
}

public partial class Program { }
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options) { public DbSet<Role> Roles => Set<Role>(); public DbSet<User> Users => Set<User>(); public DbSet<Category> Categories => Set<Category>(); public DbSet<Product> Products => Set<Product>(); public DbSet<Cart> Carts => Set<Cart>(); public DbSet<CartItem> CartItems => Set<CartItem>(); public DbSet<Order> Orders => Set<Order>(); public DbSet<OrderItem> OrderItems => Set<OrderItem>(); public DbSet<Payment> Payments => Set<Payment>(); }
public class Role { public int Id { get; set; } public string Name { get; set; } = ""; }
public class User { public int Id { get; set; } public string FullName { get; set; } = ""; public string Email { get; set; } = ""; public string KeyValue { get; set; } = ""; public bool IsActive { get; set; } = true; public int RoleId { get; set; } public Role Role { get; set; } = null!; }
public class Category { public int Id { get; set; } public string Name { get; set; } = ""; }
public class Product { public int Id { get; set; } public string Name { get; set; } = ""; public string Description { get; set; } = ""; public decimal Price { get; set; } public int Stock { get; set; } public string ImageUrl { get; set; } = ""; public bool IsActive { get; set; } = true; public int CategoryId { get; set; } public Category Category { get; set; } = null!; public int SellerId { get; set; } }
public class Cart { public int Id { get; set; } public int UserId { get; set; } public string Status { get; set; } = "Activo"; public List<CartItem> Items { get; set; } = []; }
public class CartItem { public int Id { get; set; } public int CartId { get; set; } public int ProductId { get; set; } public Product Product { get; set; } = null!; public int Quantity { get; set; } public decimal UnitPrice { get; set; } }
public class Order { public int Id { get; set; } public int UserId { get; set; } public DateTime CreatedAt { get; set; } public string ShippingAddress { get; set; } = ""; public string Status { get; set; } = "Pendiente"; public decimal Total { get; set; } public List<OrderItem> Items { get; set; } = []; public Payment Payment { get; set; } = null!; }
public class OrderItem { public int Id { get; set; } public int OrderId { get; set; } public int ProductId { get; set; } public Product Product { get; set; } = null!; public int Quantity { get; set; } public decimal UnitPrice { get; set; } }
public class Payment { public int Id { get; set; } public int OrderId { get; set; } public string Method { get; set; } = "Mock"; public string Status { get; set; } = "Pendiente"; public string AuthorizationCode { get; set; } = ""; }
public record RegisterRequest(string FullName, string Email, string Password, string Role = "Cliente");
public record LoginRequest(string Email, string Password);
public record ProductWriteRequest(string Name, string Description, decimal Price, int Stock, string ImageUrl, int CategoryId, int SellerId, bool IsActive = true);
public record StatusRequest(bool IsActive);
public record AddCartItemRequest(int UserId, int ProductId, int Quantity);
public record CheckoutRequest(int UserId, string ShippingAddress, string PaymentMethod);
public record OrderStatusRequest(string Status);
public record UserDto(int Id, string FullName, string Email, string Role, bool IsActive);
public record LoginResponse(string Token, UserDto User);
public record ProductDto(int Id, string Name, string Description, decimal Price, int Stock, string ImageUrl, string Category, int CategoryId, int SellerId, bool IsActive);
public record CartDto(int Id, int UserId, List<CartItemDto> Items, decimal Total) { public static CartDto From(Cart? c) => c is null ? new CartDto(0, 0, [], 0) : new CartDto(c.Id, c.UserId, c.Items.Select(x => new CartItemDto(x.ProductId, x.Product.Name, x.Quantity, x.UnitPrice, x.Quantity * x.UnitPrice)).ToList(), c.Items.Sum(x => x.Quantity * x.UnitPrice)); }
public record CartItemDto(int ProductId, string ProductName, int Quantity, decimal UnitPrice, decimal Subtotal);
public record OrderDto(int Id, int UserId, string Status, decimal Total, DateTime CreatedAt);
public record ReportDto(decimal TotalSales, int TotalOrders, int TotalUsers, int TotalProducts);
