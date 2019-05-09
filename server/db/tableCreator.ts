import { Table, VarChar, Decimal, Int, Bit, Time, Date as _Date } from 'mssql'

export const agencyCreator = (table: Table) => {
  table.columns.add('agency_id', VarChar(50), { nullable: false })
  table.columns.add('agency_name', VarChar(100), { nullable: false })
  table.columns.add('agency_url', VarChar(100), { nullable: false })
  table.columns.add('agency_timezone', VarChar(100), {
    nullable: false,
  })
  table.columns.add('agency_lang', VarChar(50), { nullable: true })
  table.columns.add('agency_phone', VarChar(50), { nullable: true })
  table.columns.add('agency_fare_url', VarChar(100), {
    nullable: true,
  })
  table.columns.add('agency_email', VarChar(50), { nullable: true })
  return table
}

export const stopsCreator = (table: Table) => {
  table.columns.add('stop_id', VarChar(100), { nullable: false })
  table.columns.add('stop_code', VarChar(50), { nullable: true })
  table.columns.add('stop_name', VarChar(100), { nullable: false })
  table.columns.add('stop_desc', VarChar(150), { nullable: true })
  table.columns.add('stop_lat', Decimal(10, 6), { nullable: false })
  table.columns.add('stop_lon', Decimal(10, 6), { nullable: false })
  table.columns.add('zone_id', VarChar(50), { nullable: true })
  table.columns.add('stop_url', VarChar(100), { nullable: true })
  table.columns.add('location_type', Int, { nullable: true })
  table.columns.add('parent_station', VarChar(100), { nullable: true })
  table.columns.add('stop_timezone', VarChar(100), { nullable: true })
  table.columns.add('wheelchair_boarding', Int, { nullable: true })
  return table
}

export const routesCreator = (table: Table) => {
  table.columns.add('route_id', VarChar(100), { nullable: false })
  table.columns.add('agency_id', VarChar(100), { nullable: true })
  table.columns.add('route_short_name', VarChar(50), {
    nullable: false,
  })
  table.columns.add('route_long_name', VarChar(150), {
    nullable: true,
  })
  table.columns.add('route_desc', VarChar(150), { nullable: true })
  table.columns.add('route_type', Int, { nullable: false })
  table.columns.add('route_url', VarChar(150), { nullable: true })
  table.columns.add('route_color', VarChar(50), { nullable: true })
  table.columns.add('route_text_color', VarChar(50), {
    nullable: true,
  })
  return table
}

export const tripsCreator = (table: Table) => {
  table.columns.add('route_id', VarChar(100), { nullable: false })
  table.columns.add('service_id', VarChar(100), { nullable: false })
  table.columns.add('trip_id', VarChar(100), { nullable: false })
  table.columns.add('trip_headsign', VarChar(100), { nullable: true })
  table.columns.add('trip_short_name', VarChar(50), { nullable: true })
  table.columns.add('direction_id', Int, { nullable: true })
  table.columns.add('block_id', VarChar(100), { nullable: true })
  table.columns.add('shape_id', VarChar(100), { nullable: true })
  table.columns.add('wheelchair_accessible', Int, { nullable: true })
  table.columns.add('bikes_allowed', Int, { nullable: true })
  return table
}

export const stopTimesCreator = (table: Table) => {
  table.columns.add('trip_id', VarChar(100), { nullable: false })
  table.columns.add('arrival_time', Time(0), { nullable: false })
  table.columns.add('departure_time', Time(0), { nullable: false })
  table.columns.add('arrival_time_24', Bit, { nullable: false })
  table.columns.add('departure_time_24', Bit, { nullable: false })
  table.columns.add('stop_id', VarChar(50), { nullable: false })
  table.columns.add('stop_sequence', Int, { nullable: false })
  table.columns.add('stop_headsign', VarChar(50), { nullable: true })
  table.columns.add('pickup_type', Int, { nullable: true })
  table.columns.add('drop_off_type', Int, { nullable: true })
  table.columns.add('shape_dist_traveled', VarChar(50), {
    nullable: true,
  })
  table.columns.add('timepoint', Int, { nullable: true })
  return table
}

export const calendarCreator = (table: Table) => {
  table.columns.add('service_id', VarChar(100), { nullable: false })
  table.columns.add('monday', Bit, { nullable: false })
  table.columns.add('tuesday', Bit, { nullable: false })
  table.columns.add('wednesday', Bit, { nullable: false })
  table.columns.add('thursday', Bit, { nullable: false })
  table.columns.add('friday', Bit, { nullable: false })
  table.columns.add('saturday', Bit, { nullable: false })
  table.columns.add('sunday', Bit, { nullable: false })
  table.columns.add('start_date', _Date, { nullable: false })
  table.columns.add('end_date', _Date, { nullable: false })
  return table
}

export const calendarDatesCreator = (table: Table) => {
  table.columns.add('service_id', VarChar(100), { nullable: false })
  table.columns.add('date', _Date, { nullable: false })
  table.columns.add('exception_type', Int, { nullable: false })
  return table
}
