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
	flag.StringVar(&apiEndpoint, "e", "https://waka.app", "api endpoint to proxy to")
	flag.Parse()
	logrus.SetFormatter(&logrus.JSONFormatter{})
}

func main() {
	ping := NewPing()
	proxy := NewProxy(apiEndpoint)
	layout := NewLayout()

	router := mux.NewRouter()
	router.HandleFunc("/ping", ping.Handler()).Methods("GET", "HEAD")
	router.PathPrefix("/a/").HandlerFunc(proxy.Handler()) // proxies requests to API

	// here's all the pages that exist in Waka (in the react-router)
	// some have nice static rendering, most do not
	router.HandleFunc("/", layout.Handler("home"))
	router.HandleFunc("/region", layout.Handler("page"))
	router.HandleFunc("/sponsor", layout.Handler("page"))
	router.HandleFunc("/settings", layout.Handler("page"))
	router.PathPrefix("/").HandlerFunc(layout.Handler("404"))

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	logrus.WithFields(
		logrus.Fields{
			"port": port,
		}).Infof("Starting Waka")
	logrus.Fatal(server.ListenAndServe())
}
