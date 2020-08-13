CREATE TABLE stop_times
(
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY NONCLUSTERED,
  trip_id nvarchar(100) NOT NULL,
  arrival_time time(0) NOT NULL,
  departure_time time(0) NOT NULL,
  arrival_time_24 bit NOT NULL,
  departure_time_24 bit NOT NULL,
  stop_id nvarchar(100) NOT NULL,
  stop_sequence int NOT NULL,
  stop_headsign nvarchar(100),
  pickup_type int default 0,
  drop_off_type int default 0,
  shape_dist_traveled float,
  timepoint int
);

CREATE CLUSTERED INDEX IX_Stop_Times_trip_id_stop_id
ON stop_times (trip_id, stop_id);

CREATE NONCLUSTERED INDEX IX_Stop_Times_stop_id_departure_time
ON stop_times (stop_id, departure_time)
INCLUDE (trip_id, departure_time_24, stop_sequence);

CREATE NONCLUSTERED INDEX IX_Stop_Times_departure_time
ON stop_times (departure_time)
INCLUDE (trip_id,departure_time_24,stop_id,stop_sequence);
