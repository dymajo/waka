CREATE TABLE stop_times (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY,
  trip_id nvarchar(100) NOT NULL,
  arrival_time time(0) NOT NULL,
  departure_time time(0) NOT NULL,
  arrival_time_24 bit NOT NULL,
  departure_time_24 bit NOT NULL,
  stop_id nvarchar(100) NOT NULL,
  stop_sequence int NOT NULL,
  stop_headsign nvarchar(100),
  pickup_type int,
  drop_off_type int,
  shape_dist_traveled float,
  timepoint int
)

CREATE NONCLUSTERED INDEX id_Stop_Times
ON stop_times (stop_id, departure_time)
INCLUDE (trip_id, departure_time_24, stop_sequence)

CREATE NONCLUSTERED INDEX id_Stop_Times_Trips
ON stop_times (trip_id)