CREATE TABLE temp_stops
(
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY NONCLUSTERED,
  stop_id nvarchar(100) NOT NULL,
  stop_code nvarchar(100),
  stop_name nvarchar(100) NOT NULL,
  stop_desc nvarchar(1000),
  stop_lat decimal(10,6) NOT NULL,
  stop_lon decimal(10,6) NOT NULL,
  zone_id nvarchar(50),
  stop_url nvarchar(1000),
  location_type int,
  parent_station nvarchar(100),
  stop_timezone nvarchar(100),
  wheelchair_boarding int,
  CONSTRAINT uc_temp_Stops UNIQUE (stop_id)
);
