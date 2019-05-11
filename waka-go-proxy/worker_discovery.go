package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/sirupsen/logrus"
)

type workerInfo struct {
	Prefix          string     `json:"prefix"`
	Version         string     `json:"version"`
	Name            string     `json:"name"`
	SecondaryName   string     `json:"secondaryName"`
	LongName        string     `json:"longName"`
	Bounds          bounds     `json:"-"`
	InitialLocation [2]float32 `json:"initialLocation"`
	ShowInCityList  bool       `json:"showInCityList"`
}

type bounds struct {
	Lat minMax
	Lon minMax
}

type minMax struct {
	Min float32
	Max float32
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

// Handler returns the regions
func (wd WorkerDiscovery) Handler() func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(wd.workerMap)
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
			go wd.GetWorker(prefix, data.InitialLocation, data.ShowInCityList)
		}
		time.Sleep(time.Minute * time.Duration(intervalMinutes))
	}
}
