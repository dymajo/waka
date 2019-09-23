package main

import "net/http"

type hookedResponseWriter struct {
	http.ResponseWriter
	ignore      bool
	errorWriter func(res http.ResponseWriter, req *http.Request)
}

func (hrw *hookedResponseWriter) WriteHeader(status int) {
	if status == 404 {
		hrw.ignore = true
		// our custom handler writes the 404 status
		hrw.ResponseWriter.Header().Set("Content-Type", "text/html; charset=utf-8")
		hrw.errorWriter(hrw.ResponseWriter, &http.Request{})
	} else {
		hrw.ResponseWriter.WriteHeader(status)
	}
}

func (hrw *hookedResponseWriter) Write(p []byte) (int, error) {
	if hrw.ignore {
		return len(p), nil
	}
	return hrw.ResponseWriter.Write(p)
}

// NotFoundHook allows us to have a custom 404 for a normal http fileserver
type NotFoundHook struct {
	h            http.Handler
	errorHandler func(res http.ResponseWriter, req *http.Request)
}

func (nfh NotFoundHook) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	nfh.h.ServeHTTP(&hookedResponseWriter{w, false, nfh.errorHandler}, r)
}
