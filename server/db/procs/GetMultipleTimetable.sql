-- =============================================
-- Author:		Jono Cooper <jono@jonocooper.com>
-- Create date: 2017-09-30
-- Description:	Retrieves timetable for a muti station.
-- =============================================
CREATE PROCEDURE [dbo].[GetMultipleTimetable]
	@prefix nvarchar(50),
	@version nvarchar(50),
	@stop_id nvarchar(100),
	@route_short_name nvarchar(50),
	@date date,
	@direction int
AS
BEGIN
	SET NOCOUNT ON;

	CREATE TABLE #results (
		trip_id nvarchar(50),
		service_id nvarchar(50),
		shape_id nvarchar(50),
		trip_headsign nvarchar(50),
		direction_id int,
		stop_sequence int,
		arrival_time time(0),
		arrival_time_24 bit,
		route_id nvarchar(50),
		route_long_name nvarchar(100),
		agency_id nvarchar(50)
	)

	INSERT INTO #results
		EXEC [dbo].[GetTimetable]
			@prefix = @prefix,
			@version = @version,
			@stop_id = @stop_id,
			@route_short_name = @route_short_name,
			@date = @date,
			@direction = @direction

	DECLARE @y nvarchar(50);
	SET @y = @stop_id + '1';
	INSERT INTO #results
		EXEC [dbo].[GetTimetable]
			@prefix = @prefix,
			@version = @version,
			@stop_id = @y,
			@route_short_name = @route_short_name,
			@date = @date,
			@direction = @direction
	SET @y = @stop_id + '2';

	INSERT INTO #results
		EXEC [dbo].[GetTimetable]
			@prefix = @prefix,
			@version = @version,
			@stop_id = @y,
			@route_short_name = @route_short_name,
			@date = @date,
			@direction = @direction

	SELECT * FROM #results ORDER BY arrival_time_24, arrival_time;
	DROP table #results;

END
