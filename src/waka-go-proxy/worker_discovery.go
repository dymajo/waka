package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"

	"github.com/sirupsen/logrus"
)

type workerInfo struct {
	Prefix          string     `json:"prefix"`
	Version         string     `json:"version"`
	Name            string     `json:"name"`
	SecondaryName   string     `json:"secondaryName"`
	LongName        string     `json:"longName"`
	Bounds          bounds     `json:"bounds"`
	InitialLocation [2]float32 `json:"initialLocation"`
	ShowInCityList  bool       `json:"showInCityList"`
}

type bounds struct {
	Lat minMax `json:"lat"`
	Lon minMax `json:"lon"`
}

type minMax struct {
	Min float32 `json:"min"`
	Max float32 `json:"max"`
}

type httpError struct {
	Message string `json:"message"`
	URL     string `json:"url"`
}

// WorkerDiscovery is our base struct
type WorkerDiscovery struct {
	endpoint  string
	workerMap map[string]workerInfo
}

// NewWorkerDiscovery inits our struct with a map
func NewWorkerDiscovery(endpoint string) *WorkerDiscovery {
	return &WorkerDiscovery{endpoint, make(map[string]workerInfo)}
}

/*RegionsHandler returns the available regions
 * @api {get} /regions Get Available Regions
 * @apiName GetRegions
 * @apiGroup Info
 *
 * @apiSuccess {Object} region Object of available regions
 * @apiSuccess {String} region.prefix Region Prefix
 * @apiSuccess {String} region.name Name of the Region
 * @apiSuccess {String} region.secondaryName Extra Region Name (State, Country etc)
 * @apiSuccess {String} region.longName The name and secondary name combined.
 * @apiSuccess {Array} region.initialLocation Lat, Lon array of location that map should go to when selected in the UI
 * @apiSuccess {Bool} region.showInCityList Whether this region should be visible in the UI
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "nz-akl": {
 *         "prefix": "nz-akl",
 *         "name": "Tāmaki Makaurau",
 *         "secondaryName": "Auckland",
 *         "longName": "Tāmaki Makaurau, Auckland",
 *         "initialLocation": [-36.844229, 174.767823],
 *         "showInCityList": true,
 *       },
 *       "nz-syd": {
 *         "prefix": "au-syd",
 *         "name": "Sydney",
 *         "secondaryName": "New South Wales",
 *         "longName": "Sydney, New South Wales",
 *         "initialLocation": [-43.534658, 172.637573],
 *         "showInCityList": false,
 *       }
 *     }
 *
 */
func (wd WorkerDiscovery) RegionsHandler() func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(wd.workerMap)
	}
}

// BoundsHandler looks at the query and returns the correct region
func (wd WorkerDiscovery) BoundsHandler(pathPrefix string) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		// returns a 404 if the prefix isn't auto
		prefix := mux.Vars(r)["prefix"]
		if prefix != "auto" {
			w.WriteHeader(http.StatusNotFound)
			error := httpError{
				fmt.Sprintf("prefix %s not found", prefix),
				r.URL.RequestURI(),
			}
			json.NewEncoder(w).Encode(error)
			return
		}

		lat, latErr := strconv.ParseFloat(r.FormValue("lat"), 32)
		lon, lonErr := strconv.ParseFloat(r.FormValue("lon"), 32)

		var region = "nz-akl"
		if latErr == nil && lonErr == nil {
			// if there's valid lat and lon, look through the array
			for _, v := range wd.workerMap {
				if float32(lat) >= v.Bounds.Lat.Min &&
					float32(lat) <= v.Bounds.Lat.Max &&
					float32(lon) >= v.Bounds.Lon.Min &&
					float32(lon) <= v.Bounds.Lon.Max {
					region = v.Prefix
					break
				}
			}
		}

		// Little bit of gross rewrite magic
		actualPrefix := pathPrefix
		if pathPrefix == "/" {
			actualPrefix = ""
		}
		newURL := fmt.Sprintf("%s/%s%s", actualPrefix, region, r.URL.RequestURI()[len(actualPrefix)+len(prefix)+1:len(r.URL.RequestURI())])
		http.Redirect(w, r, newURL, http.StatusFound)
	}
}

// GetWorker gets details for a particular worker
func (wd WorkerDiscovery) GetWorker(prefix string, initialLocation [2]float32, showInCityList bool) {
	response, err := http.Get(fmt.Sprintf("%s/%s/info", endpoint, prefix))
	if err != nil {
		logrus.Fatal(err)
	}
	defer response.Body.Close()

	var message = "%s is available"
	if response.StatusCode >= 400 {
		message = "%s is unavailable"
		delete(wd.workerMap, prefix)
	} else {
		result := workerInfo{}
		json.NewDecoder(response.Body).Decode(&result)
		result.InitialLocation = initialLocation
		result.ShowInCityList = showInCityList
		wd.workerMap[prefix] = result
	}
	logrus.WithFields(
		logrus.Fields{
			"prefix": prefix,
			"status": response.StatusCode,
		}).Info(fmt.Sprintf(message, prefix))
}

// Refresh loops through the regions and runs a refresh, infinitely
func (wd WorkerDiscovery) Refresh(regions Regions, intervalMinutes int) {
	for true {
		for prefix, data := range regions.regionMap {
			// bit yuck can't do async, cause can't do concurrent map writes
			wd.GetWorker(prefix, data.InitialLocation, data.ShowInCityList)
		}
		time.Sleep(time.Minute * time.Duration(intervalMinutes))
	}
}
