FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . ./
RUN dotnet restore ArtesanosMarket.Api.csproj
RUN dotnet publish ArtesanosMarket.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_ENVIRONMENT=Production
ENV Database__Provider=InMemory
ENV Database__SeedDemoData=true

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "dotnet ArtesanosMarket.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
