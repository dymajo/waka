CREATE TABLE trips (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY,
  route_id nvarchar(100) NOT NULL,
  service_id nvarchar(100) NOT NULL,
  trip_id nvarchar(100) NOT NULL,
  trip_headsign nvarchar(100),
  trip_short_name nvarchar(50),
  direction_id int,
  block_id nvarchar(100),
  shape_id nvarchar(100),
  wheelchair_accessible int,
  bikes_allowed int,
  CONSTRAINT uc_Trips UNIQUE (trip_id)
)