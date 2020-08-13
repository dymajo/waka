-- =============================================
-- Author:		Jono Cooper <jono@jonocooper.com>
-- Create date: 2017-07-30
-- Description:	Retrieves timetable for a station.
-- =============================================
CREATE PROCEDURE [dbo].[GetTimetable]
	@stop_id nvarchar(100),
	@route_short_name nvarchar(50),
	@date date,
	@direction int
AS
BEGIN
	DECLARE @Day INT = DATEPART(dw, @date);

	SET NOCOUNT ON;
	SELECT
		trips.trip_id,
		trips.service_id,
		trips.shape_id,
		trips.trip_headsign,
		trips.direction_id,
		stop_times.stop_sequence,
		stop_times.departure_time,
		stop_times.departure_time_24,
		CASE
			WHEN stop_times.arrival_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), stop_times.arrival_time) + 86400
			ELSE DATEDIFF(s, cast('00:00' AS TIME), stop_times.arrival_time)
		END AS new_arrival_time,
		CASE
			WHEN stop_times.departure_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), stop_times.departure_time) + 86400
			ELSE DATEDIFF(s, cast('00:00' AS TIME), stop_times.departure_time)
		END AS new_departure_time,
		routes.route_id,
		routes.route_long_name,
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
		(stops.parent_station = @stop_id or stops.stop_code = @stop_id) and
		routes.route_short_name = @route_short_name and
		@date >= calendar.start_date and
		@date <= calendar.end_date and
		(exception_type is null or exception_type != 2) and
		CASE
			WHEN @direction = 2 THEN 2
			ELSE trips.direction_id
		END = @direction and
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

	ORDER BY departure_time_24, departure_time
END
