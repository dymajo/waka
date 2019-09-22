package main

import (
	"flag"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

var (
	port        string
	apiEndpoint string
)

func init() {
	flag.StringVar(&port, "p", "9000", "port for server to run on")
	flag.StringVar(&apiEndpoint, "e", "https://waka.app/a", "api endpoint to proxy to")
	flag.Parse()
	logrus.SetFormatter(&logrus.JSONFormatter{})
}


func main() {
	ping := NewPing()

	router := mux.NewRouter()
	router.HandleFunc("/ping", ping.Handler()).Methods("GET", "HEAD")
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	logrus.WithFields(
		logrus.Fields{
			"port":       port,
		}).Infof("Starting Waka")
	logrus.Fatal(server.ListenAndServe())
}
