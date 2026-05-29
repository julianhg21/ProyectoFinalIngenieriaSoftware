USE master;
GO

IF DB_ID('ArtesanosMarketDb') IS NULL
BEGIN
    CREATE DATABASE ArtesanosMarketDb;
END
GO
