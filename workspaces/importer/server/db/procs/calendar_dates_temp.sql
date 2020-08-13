CREATE TABLE temp_calendar_dates (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY NONCLUSTERED,
  service_id nvarchar(100) NOT NULL,
  date date NOT NULL,
  exception_type int NOT NULL,
);
