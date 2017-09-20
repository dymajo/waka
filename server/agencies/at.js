const config = {
	prefix: 'nz-akl',
	files: [
		{
			name: 'agency.txt',
			table: 'agency'
		},
		{
			name: 'stops.txt',
			table: 'stops'
		},
		{
			name: 'routes.txt',
			table: 'routes'
		},
		{
			name: 'trips.txt',
			table: 'trips'
		},
		{
			name: 'stop_times.txt',
			table: 'stop_times'
		},
		{
			name: 'calendar.txt',
			table: 'calendar'
		},
		{
			name: 'calendar_dates.txt',
			table: 'calendar_dates'
		},
	],
	shapeFile: 'shapes.txt'
}
module.exports = config