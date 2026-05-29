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
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "cliente@demo.com",
            password = "Demo123"
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    private record ProductResponse(int Id, string Name, decimal Price);
}
