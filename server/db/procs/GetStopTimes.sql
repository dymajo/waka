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
			WHEN st.arrival_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), st.arrival_time) + 86400
			ELSE DATEDIFF(s, cast('00:00' AS TIME), st.arrival_time)
		END AS new_arrival_time,
		CASE
			WHEN st.departure_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), st.departure_time) + 86400
			ELSE DATEDIFF(s, cast('00:00' AS TIME), st.departure_time)
		END AS new_departure_time,
		st.trip_id,
		st.stop_sequence,
		st.arrival_time,
		st.arrival_time_24,
		st.departure_time,
		st.departure_time_24,
		st.stop_id,
		st.pickup_type,
		st.drop_off_type,
		t.trip_headsign,
		t.shape_id,
		t.direction_id,
		c.start_date,
		c.end_date,
		r.route_short_name,
		r.route_long_name,
		r.route_type,
		r.route_id,
		r.agency_id,
		r.route_color,
		r.route_text_color,
		s.stop_name,
		p.stop_name AS parent_station
	FROM [dbo].[stop_times] st
		LEFT JOIN [dbo].[stops] s
		ON st.stop_id = s.stop_id
		LEFT JOIN [dbo].[stops] p
		ON s.parent_station = p.stop_id
		LEFT JOIN [dbo].[trips] t
		ON st.trip_id = t.trip_id
		LEFT JOIN [dbo].[routes] r
		ON t.route_id = r.route_id
		LEFT JOIN [dbo].[calendar] c
		ON t.service_id = c.service_id
		LEFT JOIN [dbo].[calendar_dates] cd
		ON t.service_id = cd.service_id AND
			cd.date = @departure_date
	WHERE
		t.trip_headsign <> 'Empty Train'
		AND t.trip_headsign <> 'Out Of Service'
		AND (s.parent_station = @stop_id OR s.stop_code = @stop_id)
		AND st.pickup_type = 0
		AND r.route_type <> 712
		AND (
			st.departure_time > DATEADD(MINUTE, @DepatureDelay, @departure_time) AND
		st.departure_time < CASE WHEN @DateDifference > 0 THEN DATEADD(MINUTE, @DepatureFuture, @departure_time) ELSE '23:59:59' END OR
		st.departure_time < CASE WHEN @DateDifference <= 0 THEN DATEADD(MINUTE, @DepatureFuture, @departure_time) ELSE '00:00:00' END
		)
		AND (cd.exception_type IS NULL OR cd.exception_type <> 2) AND
		@departure_date >= c.start_date AND
		@departure_date <= c.end_date AND
		(CASE
			WHEN @Day = 1 THEN c.sunday
            WHEN @Day = 2 THEN c.monday
            WHEN @Day = 3 THEN c.tuesday
			WHEN @Day = 4 THEN c.wednesday
			WHEN @Day = 5 THEN c.thursday
			WHEN @Day = 6 THEN c.friday
			WHEN @Day = 7 THEN c.saturday
            ELSE 0
        END = 1 OR cd.exception_type = 1)
	ORDER BY new_departure_time ASC;
END;
