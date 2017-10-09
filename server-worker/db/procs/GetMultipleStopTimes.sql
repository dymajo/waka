-- =============================================
-- Author:		Jono Cooper <jono@jonocooper.com>
-- Create date: 2017-09-30
-- Description:	Retrieves stop times for a multi station
-- =============================================
CREATE PROCEDURE [dbo].[GetMultipleStopTimes]
	@stop_id nvarchar(100),
	@departure_time time,
	@date date
AS
BEGIN
	SET NOCOUNT ON;

	CREATE TABLE #results (
		trip_id nvarchar(50),
		stop_sequence int,
		departure_time time(0),
		departure_time_24 bit,
		trip_headsign nvarchar(50),
		shape_id nvarchar(50),
		direction_id int,
		start_date date,
		end_date date,
		route_short_name nvarchar(50),
		route_long_name nvarchar(100),
		route_type int,
		agency_id nvarchar(50)
	)

	INSERT INTO #results
		EXEC [dbo].[GetStopTimes]
			@stop_id = @stop_id,
			@departure_time = @departure_time,
			@date = @date

	DECLARE @y nvarchar(50);
	SET @y = @stop_id + '1';
	INSERT INTO #results
		EXEC [dbo].[GetStopTimes]
			@stop_id = @y,
			@departure_time = @departure_time,
			@date = @date
	SET @y = @stop_id + '2';
	INSERT INTO #results
		EXEC [dbo].[GetStopTimes]
			@stop_id = @y,
			@departure_time = @departure_time,
			@date = @date

	SELECT * FROM #results ORDER BY departure_time, departure_time_24;
	DROP table #results;

END
