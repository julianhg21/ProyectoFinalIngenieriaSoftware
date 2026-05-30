using Microsoft.Extensions.Configuration;

namespace Microsoft.EntityFrameworkCore;

public static class SqlServerProviderRedirect
{
    public static DbContextOptionsBuilder UseInMemoryDatabase(this DbContextOptionsBuilder optionsBuilder, string databaseName)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? string.Empty;

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true, reloadOnChange: false)
            .AddEnvironmentVariables()
            .Build();

        var provider = configuration["Database:Provider"] ?? "SqlServer";

        if (provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
        {
            return Microsoft.EntityFrameworkCore.InMemoryDbContextOptionsExtensions.UseInMemoryDatabase(optionsBuilder, databaseName);
        }

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("No se encontró la cadena de conexión DefaultConnection.");

        return optionsBuilder.UseSqlServer(connectionString);
    }
}
