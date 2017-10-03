-- =============================================
-- Author:		Jono Cooper <jono@jonocooper.com>
-- Create date: 2017-07-30
-- Description:	Retrieves stop times for a station.
-- =============================================
CREATE PROCEDURE [dbo].[GetStopTimes]
	@stop_id nvarchar(100),
	@departure_time time,
	@date date
AS
BEGIN
	SET NOCOUNT ON;
	DECLARE @DepatureDelay INT = -30;
	DECLARE @DepatureFuture INT = 180;
	DECLARE @Day INT = DATEPART(dw, @date);

	DECLARE @DateDifference INT = DATEDIFF(MINUTE, DATEADD(MINUTE, @DepatureDelay, @departure_time), DATEADD(MINUTE, @DepatureFuture, @departure_time));

	SELECT
		stop_times.trip_id,
		stop_times.stop_sequence,
		stop_times.departure_time,
		stop_times.departure_time_24,
		stop_times.arrival_time,
		stop_times.arrival_time_24,
		trips.trip_headsign,
		trips.shape_id,
		trips.direction_id,
		calendar.start_date,
		calendar.end_date,
		routes.route_short_name,
		routes.route_long_name,
		routes.route_type,
		routes.agency_id
	FROM stop_times
	LEFT JOIN stops
		on stop_times.stop_id = stops.stop_id
	LEFT JOIN trips
		on stop_times.trip_id = trips.trip_id
	LEFT JOIN routes
		on trips.route_id = routes.route_id
	LEFT JOIN calendar
		on trips.service_id = calendar.service_id
	LEFT JOIN calendar_dates
		on trips.service_id = calendar_dates.service_id and
		calendar_dates.date = @date
	WHERE
		stops.stop_code = @stop_id and
		(
			departure_time > DATEADD(MINUTE, @DepatureDelay, @departure_time) and
			departure_time < CASE WHEN @DateDifference > 0 THEN DATEADD(MINUTE, @DepatureFuture, @departure_time) ELSE '23:59:59' END or
			departure_time < CASE WHEN @DateDifference <= 0 THEN DATEADD(MINUTE, @DepatureFuture, @departure_time) ELSE '00:00:00' END
		)
		and (exception_type is null or exception_type != 2) and
		@date >= calendar.start_date and
		@date <= calendar.end_date and
		(CASE 
			WHEN @Day = 1 THEN calendar.sunday
            WHEN @Day = 2 THEN calendar.monday
            WHEN @Day = 3 THEN calendar.tuesday
			WHEN @Day = 4 THEN calendar.wednesday
			WHEN @Day = 5 THEN calendar.thursday
			WHEN @Day = 6 THEN calendar.friday
			WHEN @Day = 7 THEN calendar.saturday
            ELSE 0 
        END = 1 or exception_type = 1)

	ORDER BY departure_time asc

END
