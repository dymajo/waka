
CREATE PROCEDURE [dbo].[GetRoutes]
AS

SELECT route_short_name,
      route_long_name,
      agency_id,
      route_type,
      route_color,
      route_desc,
      route_id
FROM routes
WHERE route_type <> 712 OR route_desc <> 'School Buses'
ORDER BY route_type,
         dbo.fn_CreateAlphanumericSortValue(route_short_name, 0);