package main

import (
	"net/http/httputil"
	"net/url"
	"net/http"
)

// Proxy sends requests to another server
type Proxy struct {
	Target string
}

// NewProxy inits our struct
func NewProxy(target string) *Proxy {
	return &Proxy{target}
}

// Handler sends http requests to the right place
func (p Proxy) Handler() func(http.ResponseWriter, *http.Request) {
	return func(res http.ResponseWriter, req *http.Request) {
		url, _ := url.Parse(p.Target)
		proxy := httputil.NewSingleHostReverseProxy(url)

		// make SSL redirection work
		req.URL.Host = url.Host
		req.URL.Scheme = url.Scheme
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Host = url.Host

		proxy.ServeHTTP(res, req)
	}
}
