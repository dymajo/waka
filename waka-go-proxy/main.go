package main

import (
	"flag"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

var (
	port     string
	endpoint string
)

func init() {
	flag.StringVar(&port, "p", "9001", "port for server to run on")
	flag.StringVar(&endpoint, "e", "https://waka.app/a", "endpoint to discover on")
	flag.Parse()
}

func main() {
	ping := NewPing()
	workerDiscovery := NewWorkerDiscovery(endpoint)
	workerDiscovery.GetWorker("nz-akl")
	workerDiscovery.GetWorker("nz-wlg")
	workerDiscovery.GetWorker("au-syd")

	router := mux.NewRouter()
	router.HandleFunc("/regions", workerDiscovery.Handler()).Methods("GET", "HEAD")
	router.HandleFunc("/ping", ping.Handler()).Methods("GET", "HEAD")

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	logrus.Infof("Starting server on port %q", port)
	logrus.Fatal(server.ListenAndServe())
}
