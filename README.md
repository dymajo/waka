# waka-importer

This is a standalone program that does the import from the transit agency into SQL Server, and S3/Azure. It's run by the Waka orchestrator, when it needs to import new data.

## Running it manually

Set the following environmental variables in a `.env` file, and then run `npm start`. You can also run this with Docker!

- PREFIX (nz-wlg, nz-akl etc)
- VERSION (v1, 2018, etc)
- DB_USER (SA)
- DB_PASSWORD (Str0ngPassword)
- DB_SERVER (localhost)
- MODE (all, shapes, etc)

There's also a couple of optional variables, that have sensible defaults - see `server/index.js` for the details.
