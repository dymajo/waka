CREATE TABLE temp_frequencies (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY NONCLUSTERED,
  trip_id nvarchar(100) NOT NULL,
  start_time time(0) NOT NULL,
  end_time time(0) NOT NULL,
  headway_sec INT NOT NULL,
  exact_times INT
);