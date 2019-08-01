-- =============================================
-- Author:		Jono Cooper <jono@jonocooper.com> and Matt Davidson <matt@mattdavidson.kiwi>
-- Create date: 2017-07-30
-- Updated: 2019-03-18
-- Description:	Retrieves stop times for a station.
-- =============================================
CREATE PROCEDURE [dbo].[GetStopTimes]
	@stop_id NVARCHAR(100),
	@departure_time TIME,
	@departure_date DATE
AS
BEGIN
	SET NOCOUNT ON;


	DECLARE @DepatureDelay INT = -30;
	DECLARE @DepatureFuture INT = 180;
	DECLARE @Day INT = DATEPART(dw, @departure_date);

	DECLARE @DateDifference INT = DATEDIFF(MINUTE, DATEADD(MINUTE, @DepatureDelay, @departure_time), DATEADD(MINUTE, @DepatureFuture, @departure_time));

	SELECT
		CASE
			WHEN stop_time.arrival_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), stop_time.arrival_time) + 86400
			ELSE DATEDIFF(s, cast('00:00' AS TIME), stop_time.arrival_time)
		END AS new_arrival_time,
		CASE
			WHEN stop_time.departure_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), stop_time.departure_time) + 86400
			ELSE DATEDIFF(s, cast('00:00' AS TIME), stop_time.departure_time)
		END AS new_departure_time,
		stop_time.trip_id,
		stop_time.stop_sequence,
		stop_time.arrival_time,
		stop_time.arrival_time_24,
		stop_time.departure_time,
		stop_time.departure_time_24,
		stop_time.stop_id,
		stop_time.pickup_type,
		stop_time.drop_off_type,
		trip.trip_headsign,
		trip.shape_id,
		trip.direction_id,
		calendar.start_date,
		calendar.end_date,
		route.route_short_name,
		route.route_long_name,
		route.route_type,
		route.route_id,
		route.agency_id,
		route.route_color,
		stop.stop_name
	FROM [dbo].[stop_times] stop_time
		LEFT JOIN [dbo].[stops] stop
		ON stop_time.stop_id = stop.stop_id
		LEFT JOIN [dbo].[trips] trip
		ON stop_time.trip_id = trip.trip_id
		LEFT JOIN [dbo].[routes] route
		ON trip.route_id = route.route_id
		LEFT JOIN [dbo].[calendar] calendar
		ON trip.service_id = calendar.service_id
		LEFT JOIN [dbo].[calendar_dates] calendar_date
		ON trip.service_id = calendar_date.service_id AND
			calendar_date.date = @departure_date
	WHERE
		(trip.trip_headsign <> 'Empty Train' OR trip.trip_headsign <> 'Out Of Service') AND
		(stop.parent_station = @stop_id OR stop.stop_code = @stop_id) AND
		(
			stop_time.departure_time > DATEADD(MINUTE, @DepatureDelay, @departure_time) AND
		stop_time.departure_time < CASE WHEN @DateDifference > 0 THEN DATEADD(MINUTE, @DepatureFuture, @departure_time) ELSE '23:59:59' END OR
		stop_time.departure_time < CASE WHEN @DateDifference <= 0 THEN DATEADD(MINUTE, @DepatureFuture, @departure_time) ELSE '00:00:00' END
		)
		AND (calendar_date.exception_type IS NULL OR calendar_date.exception_type <> 2) AND
		@departure_date >= calendar.start_date AND
		@departure_date <= calendar.end_date AND
		(CASE
			WHEN @Day = 1 THEN calendar.sunday
            WHEN @Day = 2 THEN calendar.monday
            WHEN @Day = 3 THEN calendar.tuesday
			WHEN @Day = 4 THEN calendar.wednesday
			WHEN @Day = 5 THEN calendar.thursday
			WHEN @Day = 6 THEN calendar.friday
			WHEN @Day = 7 THEN calendar.saturday
            ELSE 0
        END = 1 OR calendar_date.exception_type = 1)
	ORDER BY new_departure_time ASC;
END;
