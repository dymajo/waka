CREATE TABLE routes (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY NONCLUSTERED,
  route_id nvarchar(100) NOT NULL,
  agency_id nvarchar(100),
  route_short_name nvarchar(50) NOT NULL,
  route_long_name nvarchar(150) NOT NULL,
  route_desc nvarchar(150),
  route_type int NOT NULL,
  route_url nvarchar(100),
  route_color nvarchar(50),
  route_text_color nvarchar(50),
  CONSTRAINT uc_Routes UNIQUE (route_id)
);

CREATE CLUSTERED INDEX IX_Routes_route_id
ON routes (route_id);
