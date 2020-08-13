CREATE TABLE calendar (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY NONCLUSTERED,
  service_id nvarchar(100) NOT NULL,
  monday bit NOT NULL,
  tuesday bit NOT NULL,
  wednesday bit NOT NULL,
  thursday bit NOT NULL,
  friday bit NOT NULL,
  saturday bit NOT NULL,
  sunday bit NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
);

CREATE CLUSTERED INDEX IX_Calendar_service_id
ON calendar (service_id);

CREATE NONCLUSTERED INDEX IX_Calendar_start_date_end_date
ON calendar (start_date, end_date);
