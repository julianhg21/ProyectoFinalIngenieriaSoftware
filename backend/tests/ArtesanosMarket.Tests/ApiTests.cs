using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace ArtesanosMarket.Tests;

public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ApiTests(WebApplicationFactory<Program> factory)
    {
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("DOTNET_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("Database__Provider", "InMemory");
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Home_ReturnsOk()
    {
        var response = await _client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Products_ReturnsSeededProducts()
    {
        var products = await _client.GetFromJsonAsync<List<ProductResponse>>("/api/products");
        Assert.NotNull(products);
        Assert.NotEmpty(products!);
    }

    [Fact]
    public async Task Login_DemoUser_ReturnsOk()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("cliente@demo.com", "Demo123"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Login_InvalidPassword_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("cliente@demo.com", "incorrecta"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Register_NewUser_ReturnsCreated()
    {
        var email = $"cliente-{Guid.NewGuid():N}@demo.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Cliente Prueba", email, "Demo123", "Cliente"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Cliente Duplicado", "cliente@demo.com", "Demo123", "Cliente"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateProduct_ReturnsCreated()
    {
        var response = await CreateProductAsync(stock: 3);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddToCart_WithAvailableStock_ReturnsOk()
    {
        var product = await CreateProductAndReadAsync(stock: 2);
        var response = await _client.PostAsJsonAsync("/api/cart/items", new AddCartItemRequest(1, product.Id, 1));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AddToCart_ExceedingStock_ReturnsBadRequest()
    {
        var product = await CreateProductAndReadAsync(stock: 1);
        var response = await _client.PostAsJsonAsync("/api/cart/items", new AddCartItemRequest(1, product.Id, 2));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Cart_ReturnsActiveCart()
    {
        var product = await CreateProductAndReadAsync(stock: 2);
        await _client.PostAsJsonAsync("/api/cart/items", new AddCartItemRequest(1, product.Id, 1));
        var cart = await _client.GetFromJsonAsync<CartResponse>("/api/cart/1");
        Assert.NotNull(cart);
        Assert.True(cart!.Items.Count > 0);
    }

    [Fact]
    public async Task Checkout_EmptyCart_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/orders/checkout", new CheckoutRequest(9999, "Ciudad", "Mock"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Checkout_WithCart_ReturnsOk()
    {
        var email = $"checkout-{Guid.NewGuid():N}@demo.com";
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Cliente Checkout", email, "Demo123", "Cliente"));
        var createdUser = await registerResponse.Content.ReadFromJsonAsync<UserResponse>();
        var product = await CreateProductAndReadAsync(stock: 3);

        await _client.PostAsJsonAsync("/api/cart/items", new AddCartItemRequest(createdUser!.Id, product.Id, 1));
        var response = await _client.PostAsJsonAsync("/api/orders/checkout", new CheckoutRequest(createdUser.Id, "Ciudad de Guatemala", "Mock"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SellerOrders_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/orders/seller/2");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AdminUsers_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AdminReport_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/admin/report");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<HttpResponseMessage> CreateProductAsync(int stock)
    {
        var product = new ProductWriteRequest(
            $"Producto Prueba {Guid.NewGuid():N}",
            "Producto creado desde pruebas automatizadas.",
            25,
            stock,
            "https://images.unsplash.com/photo-1523293182086-7651a899d37f",
            1,
            2,
            true);

        return await _client.PostAsJsonAsync("/api/products", product);
    }

    private async Task<ProductResponse> CreateProductAndReadAsync(int stock)
    {
        var response = await CreateProductAsync(stock);
        response.EnsureSuccessStatusCode();
        var product = await response.Content.ReadFromJsonAsync<ProductResponse>();
        return product!;
    }

    private record ProductResponse(int Id, string Name, decimal Price, int Stock = 0);
    private record CartResponse(int Id, int UserId, List<CartItemResponse> Items, decimal Total);
    private record CartItemResponse(int ProductId, string ProductName, int Quantity, int Stock, decimal UnitPrice, decimal Subtotal);
    private record UserResponse(int Id, string FullName, string Email, string Role, bool IsActive);
}
