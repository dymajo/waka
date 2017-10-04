CREATE TABLE workers (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  version nvarchar(50) NOT NULL,
  status nvarchar(50),
  startpolicy nvarchar(50),
  dbconfig nvarchar(50),
  dbname nvarchar(100),
  CONSTRAINT uc_Workers UNIQUE (prefix, version)
)

CREATE TABLE mappings (
  id int NOT NULL IDENTITY(1,1) PRIMARY KEY,
  prefix nvarchar(50) NOT NULL,
  worker_id int,
  CONSTRAINT uc_Mappings UNIQUE (prefix)
)