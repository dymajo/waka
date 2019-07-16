CREATE TABLE temp_calendar (
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

