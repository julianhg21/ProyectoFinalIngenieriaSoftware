using Microsoft.EntityFrameworkCore;

public static class ExtraEndpoints
{
    public static void MapExtraEndpoints(this WebApplication app)
    {
        app.MapPut("/api/cart/items", async (UpdateCartItemRequest r, AppDbContext db) =>
        {
            var cart = await GetActiveCart(r.UserId, db);
            if (cart is null) return Results.NotFound(new { message = "Carrito no encontrado." });

            var item = cart.Items.FirstOrDefault(x => x.ProductId == r.ProductId);
            if (item is null) return Results.NotFound(new { message = "Producto no encontrado en el carrito." });

            if (r.Quantity <= 0)
            {
                cart.Items.Remove(item);
            }
            else
            {
                if (r.Quantity > item.Product.Stock)
                    return Results.BadRequest(new { message = $"No hay suficiente stock para {item.Product.Name}. Stock disponible: {item.Product.Stock}. Cantidad solicitada: {r.Quantity}." });

                item.Quantity = r.Quantity;
            }

            await db.SaveChangesAsync();
            return Results.Ok(CartDto.From(await GetActiveCart(r.UserId, db)));
        });

        app.MapDelete("/api/cart/{userId:int}/items/{productId:int}", async (int userId, int productId, AppDbContext db) =>
        {
            var cart = await GetActiveCart(userId, db);
            if (cart is null) return Results.Ok(CartDto.From(null));

            var item = cart.Items.FirstOrDefault(x => x.ProductId == productId);
            if (item is not null) cart.Items.Remove(item);

            await db.SaveChangesAsync();
            return Results.Ok(CartDto.From(await GetActiveCart(userId, db)));
        });

        app.MapDelete("/api/cart/{userId:int}", async (int userId, AppDbContext db) =>
        {
            var cart = await GetActiveCart(userId, db);
            if (cart is not null) cart.Items.Clear();

            await db.SaveChangesAsync();
            return Results.Ok(CartDto.From(await GetActiveCart(userId, db)));
        });

        app.MapPost("/api/orders/checkout-full", async (CheckoutFullRequest r, AppDbContext db) =>
        {
            var cart = await GetActiveCart(r.UserId, db);
            if (cart is null || cart.Items.Count == 0)
                return Results.BadRequest(new { message = "El carrito está vacío." });

            var itemWithoutStock = cart.Items.FirstOrDefault(x => x.Quantity > x.Product.Stock);
            if (itemWithoutStock is not null)
                return Results.BadRequest(new { message = $"No hay suficiente stock para {itemWithoutStock.Product.Name}. Stock disponible: {itemWithoutStock.Product.Stock}. Cantidad solicitada: {itemWithoutStock.Quantity}." });

            var shippingText = $"Dirección: {r.ShippingAddress}. Teléfono: {r.Phone}. Observaciones: {r.Notes}";
            var order = new Order
            {
                UserId = r.UserId,
                ShippingAddress = shippingText,
                Status = "Confirmado",
                CreatedAt = DateTime.UtcNow,
                Total = cart.Items.Sum(x => x.Quantity * x.UnitPrice),
                Items = cart.Items.Select(x => new OrderItem { ProductId = x.ProductId, Quantity = x.Quantity, UnitPrice = x.UnitPrice }).ToList(),
                Payment = new Payment { Method = r.PaymentMethod, Status = "Aprobado", AuthorizationCode = "MOCK" }
            };

            foreach (var item in cart.Items)
                item.Product.Stock -= item.Quantity;

            cart.Status = "Convertido";
            db.Orders.Add(order);
            await db.SaveChangesAsync();

            return Results.Ok(new { order.Id, order.Status, order.Total, paymentStatus = order.Payment.Status });
        });

        app.MapGet("/api/orders/{id:int}/detail", async (int id, AppDbContext db) =>
        {
            var order = await db.Orders.Include(x => x.Items).ThenInclude(x => x.Product).Include(x => x.Payment).FirstOrDefaultAsync(x => x.Id == id);
            if (order is null) return Results.NotFound();

            return Results.Ok(new
            {
                order.Id,
                order.UserId,
                order.Status,
                order.Total,
                order.CreatedAt,
                order.ShippingAddress,
                PaymentMethod = order.Payment.Method,
                PaymentStatus = order.Payment.Status,
                Items = order.Items.Select(i => new
                {
                    i.ProductId,
                    ProductName = i.Product.Name,
                    i.Quantity,
                    i.UnitPrice,
                    Subtotal = i.Quantity * i.UnitPrice
                })
            });
        });

        app.MapGet("/api/seller/{sellerId:int}/summary", async (int sellerId, AppDbContext db) =>
        {
            var items = await db.OrderItems.Include(x => x.Product).Where(x => x.Product.SellerId == sellerId).ToListAsync();
            var productSales = items.GroupBy(x => new { x.ProductId, x.Product.Name })
                .Select(g => new ProductSalesDto(g.Key.ProductId, g.Key.Name, g.Sum(x => x.Quantity), g.Sum(x => x.Quantity * x.UnitPrice)))
                .OrderByDescending(x => x.TotalSold)
                .ToList();

            return Results.Ok(new SellerSummaryDto(items.Sum(x => x.Quantity * x.UnitPrice), items.Sum(x => x.Quantity), productSales));
        });

        app.MapGet("/api/admin/report-v2", async (AppDbContext db) =>
        {
            var items = await db.OrderItems.Include(x => x.Product).ToListAsync();
            var topProducts = items.GroupBy(x => new { x.ProductId, x.Product.Name })
                .Select(g => new ProductSalesDto(g.Key.ProductId, g.Key.Name, g.Sum(x => x.Quantity), g.Sum(x => x.Quantity * x.UnitPrice)))
                .OrderByDescending(x => x.TotalSold)
                .Take(5)
                .ToList();

            var recentOrders = await db.Orders.OrderByDescending(x => x.CreatedAt).Take(5).Select(x => new OrderDto(x.Id, x.UserId, x.Status, x.Total, x.CreatedAt)).ToListAsync();
            return Results.Ok(new ReportV2Dto(await db.Orders.SumAsync(x => x.Total), await db.Orders.CountAsync(), await db.Users.CountAsync(), await db.Products.CountAsync(), topProducts, recentOrders));
        });
    }

    private static async Task<Cart?> GetActiveCart(int userId, AppDbContext db)
    {
        return await db.Carts.Include(x => x.Items).ThenInclude(x => x.Product).FirstOrDefaultAsync(x => x.UserId == userId && x.Status == "Activo");
    }
}

public record UpdateCartItemRequest(int UserId, int ProductId, int Quantity);
public record CheckoutFullRequest(int UserId, string ShippingAddress, string Phone, string PaymentMethod, string Notes);
public record ProductSalesDto(int ProductId, string Name, int QuantitySold, decimal TotalSold);
public record SellerSummaryDto(decimal TotalSold, int UnitsSold, List<ProductSalesDto> ProductSales);
public record ReportV2Dto(decimal TotalSales, int TotalOrders, int TotalUsers, int TotalProducts, List<ProductSalesDto> TopProducts, List<OrderDto> RecentOrders);
