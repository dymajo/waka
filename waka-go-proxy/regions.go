package main

import (
	"encoding/json"
	"io/ioutil"
	"os"

	"github.com/sirupsen/logrus"
)

type city struct {
	Name            string
	SecondaryName   string
	LongName        string
	InitialLocation [2]float32
	ShowInCityList  bool
}

// Regions has static information about our regions
type Regions struct {
	regionMap map[string]city
}

// NewRegions inits our struct
func NewRegions() *Regions {
	return &Regions{make(map[string]city)}
}

// Load takes a JSON file path and populates the struct
func (r Regions) Load(path string) {
	jsonFile, err := os.Open(path)
	if err != nil {
		logrus.Fatal(err)
	}
	defer jsonFile.Close()

	byteValue, _ := ioutil.ReadAll(jsonFile)
	json.Unmarshal(byteValue, &r.regionMap)
}
