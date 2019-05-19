package main

import (
	"flag"
	"fmt"
	"net/http"
	"time"

	_ "github.com/aws/aws-xray-sdk-go/plugins/ecs"
	"github.com/aws/aws-xray-sdk-go/xray"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

var (
	port       string
	endpoint   string
	path       string
	interval   int
	pathPrefix string
	docsDir    string
	xraySuffix string
)

func init() {
	flag.StringVar(&port, "p", "9001", "port for server to run on")
	flag.StringVar(&endpoint, "e", "https://waka.app/a", "endpoint to discover on")
	flag.StringVar(&path, "f", "../cityMetadata.json", "path to city metadata json")
	flag.IntVar(&interval, "m", 1, "minutes between requests")
	flag.StringVar(&pathPrefix, "pathprefix", "/", "you can prefix all the routes, if you need")
	flag.StringVar(&docsDir, "docsdir", "../dist/docs", "the path to the documentatino directory")
	flag.StringVar(&xraySuffix, "s", "", "xray suffix")
	flag.Parse()
	logrus.SetFormatter(&logrus.JSONFormatter{})
}

func docsRedirectHandler() func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/docs/", http.StatusFound)
	}
}

func xrayMiddleware(next http.Handler) http.Handler {
	return xray.Handler(xray.NewFixedSegmentNamer(fmt.Sprintf("waka-proxy%s", xraySuffix)), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	}))
}

func main() {
	ping := NewPing()
	regions := NewRegions()
	workerDiscovery := NewWorkerDiscovery(endpoint)
	regions.Load(path)
	go workerDiscovery.Refresh(*regions, interval, xraySuffix)

	router := mux.NewRouter()
	router.Use(xrayMiddleware)
	subRouter := router.PathPrefix(pathPrefix).Subrouter()
	subRouter.HandleFunc("/ping", ping.Handler()).Methods("GET", "HEAD")
	subRouter.HandleFunc("/regions", workerDiscovery.RegionsHandler()).Methods("GET", "HEAD")
	subRouter.HandleFunc("/docs", docsRedirectHandler())
	subRouter.PathPrefix("/docs/").Handler(http.StripPrefix("/docs", http.FileServer(http.Dir(docsDir))))
	subRouter.PathPrefix("/{prefix}").HandlerFunc(workerDiscovery.BoundsHandler(pathPrefix)).Methods("GET", "HEAD")

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	logrus.WithFields(
		logrus.Fields{
			"port":       port,
			"pathPrefix": pathPrefix,
		}).Infof("Starting waka-go-proxy")
	logrus.Fatal(server.ListenAndServe())
}
