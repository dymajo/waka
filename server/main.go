package main

import (
	"flag"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

var (
	port         string
	apiEndpoint  string
	staticPath   string
	assetsPath   string
	assetsPrefix string
)

func init() {
	flag.StringVar(&port, "p", "9000", "port for server to run on")
	flag.StringVar(&apiEndpoint, "e", "https://waka.app", "api endpoint to proxy to")
	flag.StringVar(&staticPath, "sp", "../dist", "path to static assets")
	flag.StringVar(&assetsPath, "af", "../dist/assets.json", "assets json file")
	flag.StringVar(&assetsPrefix, "ap", "", "prefix urls of assets - optional")
	flag.Parse()
	if assetsPrefix == "/" {
		assetsPrefix = ""
	}
	logrus.SetFormatter(&logrus.JSONFormatter{})
}

func main() {
	ping := NewPing()
	feedback := NewFeedback()
	proxy := NewProxy(apiEndpoint)
	layout := NewLayout(assetsPath, assetsPrefix)

	router := mux.NewRouter()
	router.HandleFunc("/ping", ping.Handler()).Methods("GET", "HEAD")
	router.PathPrefix("/a/").HandlerFunc(proxy.Handler()) // proxies requests to API

	// implement non-waka server API requests in /b/
	router.PathPrefix("/b/feedback").HandlerFunc(feedback.Handler()).Methods("POST", "HEAD")

	// here's all the pages that exist in Waka (in the react-router)
	// some have nice static rendering, most do not
	router.HandleFunc("/", layout.Handler("home"))

	// stations
	router.HandleFunc("/s/{region}/{station}", layout.Handler("page"))
	router.HandleFunc("/s/{region}/{station}/save", layout.Handler("page"))

	// lines
	router.HandleFunc("/l/{region}", layout.Handler("page"))
	router.HandleFunc("/l/{region}/all", layout.Handler("page"))
	router.HandleFunc("/l/{region}/{agency}/{route_short_name}", layout.Handler("page"))
	router.HandleFunc("/l/{region}/{agency}/{route_short_name}/picker", layout.Handler("page"))

	// other pages
	router.HandleFunc("/fail", layout.Handler("page"))
	router.HandleFunc("/feedback", layout.Handler("page"))
	router.HandleFunc("/region", layout.Handler("page"))
	router.HandleFunc("/sponsor", layout.Handler("page"))
	router.HandleFunc("/settings", layout.Handler("page"))

	// fallback to local assets, and then to a 404 page
	notFound := layout.Handler("404")
	router.PathPrefix("/").Handler(NotFoundHook{http.FileServer(http.Dir(staticPath)), notFound})
	router.NotFoundHandler = http.HandlerFunc(notFound)

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
