USE ArtesanosMarketDb;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Roles)
BEGIN
    INSERT INTO dbo.Roles (Name)
    VALUES ('Cliente'), ('Vendedor'), ('Administrador');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Categories)
BEGIN
    INSERT INTO dbo.Categories (Name)
    VALUES ('Textiles'), ('Cerámica'), ('Madera'), ('Joyería');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'cliente@demo.com')
BEGIN
    INSERT INTO dbo.Users (FullName, Email, KeyValue, IsActive, RoleId)
    SELECT 'Cliente Demo', 'cliente@demo.com', 'RGVtbzEyMw==', 1, Id FROM dbo.Roles WHERE Name = 'Cliente';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'vendedor@demo.com')
BEGIN
    INSERT INTO dbo.Users (FullName, Email, KeyValue, IsActive, RoleId)
    SELECT 'Vendedor Demo', 'vendedor@demo.com', 'RGVtbzEyMw==', 1, Id FROM dbo.Roles WHERE Name = 'Vendedor';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'admin@demo.com')
BEGIN
    INSERT INTO dbo.Users (FullName, Email, KeyValue, IsActive, RoleId)
    SELECT 'Administrador Demo', 'admin@demo.com', 'RGVtbzEyMw==', 1, Id FROM dbo.Roles WHERE Name = 'Administrador';
END
GO

DECLARE @SellerId INT = (SELECT TOP 1 Id FROM dbo.Users WHERE Email = 'vendedor@demo.com');
DECLARE @Textiles INT = (SELECT TOP 1 Id FROM dbo.Categories WHERE Name = 'Textiles');
DECLARE @Ceramica INT = (SELECT TOP 1 Id FROM dbo.Categories WHERE Name = 'Cerámica');
DECLARE @Madera INT = (SELECT TOP 1 Id FROM dbo.Categories WHERE Name = 'Madera');
DECLARE @Joyeria INT = (SELECT TOP 1 Id FROM dbo.Categories WHERE Name = 'Joyería');

IF NOT EXISTS (SELECT 1 FROM dbo.Products)
BEGIN
    INSERT INTO dbo.Products (Name, Description, Price, Stock, ImageUrl, IsActive, CategoryId, SellerId)
    VALUES
    ('Huipil artesanal', 'Textil guatemalteco hecho a mano.', 350.00, 5, 'https://placehold.co/600x400', 1, @Textiles, @SellerId),
    ('Taza de cerámica', 'Pieza de cerámica local.', 85.00, 12, 'https://placehold.co/600x400', 1, @Ceramica, @SellerId),
    ('Caja de madera', 'Caja decorativa tallada a mano.', 145.00, 8, 'https://placehold.co/600x400', 1, @Madera, @SellerId),
    ('Pulsera artesanal', 'Pulsera elaborada por productores locales.', 45.00, 20, 'https://placehold.co/600x400', 1, @Joyeria, @SellerId);
END
GO
