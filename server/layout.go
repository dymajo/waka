package main

import (
	"html/template"
	"net/http"
)

type Layout struct {
	Templates *template.Template
}

// NewLayout return a new Layout, with all the templates loaded in
func NewLayout() *Layout {
	t := template.Must(
		template.New("").Funcs(template.FuncMap{
			"WrapHeader": WrapHeader,
			"WrapFooter": WrapFooter,
		}).ParseGlob("./templates/*.html"))
	return &Layout{t}
}

// WrapHeader passes in a few bits of metadata into the header HTML section
func WrapHeader(title string, description string) map[string]interface{} {
	return map[string]interface{}{
		"Title":       title,
		"Description": description,
		"CSSPath":     "blahblahblah",
	}
}

// WrapFooter passes in metadata to our footer section
func WrapFooter() map[string]interface{} {
	return map[string]interface{}{
		"VendorPath":    "scriptscript1.js",
		"MainPath":      "scriptscript2.js",
		"AnalyticsPath": "scriptscript3.js",
	}
}

const defaultTitle = "Waka"
const defaultDescription = "Waka is your realtime guide to public transport in New Zealand."

// Handler is our fallback page - it lets JavaScript take over
func (l Layout) Handler(layout string) func(http.ResponseWriter, *http.Request) {
	return func(res http.ResponseWriter, req *http.Request) {
		fullData := map[string]interface{}{
			"Title":       defaultTitle,
			"Description": defaultDescription,
		}
		l.Templates.ExecuteTemplate(res, layout, fullData)
	}
}
