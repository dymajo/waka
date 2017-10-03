CREATE TABLE calendar_dates (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  service_id nvarchar(100) NOT NULL,
  date date NOT NULL,
  exception_type int NOT NULL,
)

CREATE NONCLUSTERED INDEX id_Calendar_Dates
ON calendar_dates (service_id, date)