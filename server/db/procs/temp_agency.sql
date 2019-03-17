CREATE TABLE temp_agency (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY,
  agency_id nvarchar(100) NOT NULL,
  agency_name nvarchar(100) NOT NULL,
  agency_url nvarchar(100) NOT NULL,
  agency_timezone nvarchar(100) NOT NULL,
  agency_lang nvarchar(50),
  agency_phone nvarchar(50),
  agency_fare_url nvarchar(100),
  agency_email nvarchar(50),
  CONSTRAINT uc_temp_Agency UNIQUE (agency_id)
)