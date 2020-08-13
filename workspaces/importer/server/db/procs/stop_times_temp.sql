CREATE TABLE temp_stop_times
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
