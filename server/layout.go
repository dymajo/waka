package main

import (
	"bytes"
	"html/template"
	"net/http"
)

// Layout serves our HTML templates
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

		// write our response into a buffer, before sending it for reals
		buf := &bytes.Buffer{}
		err := l.Templates.ExecuteTemplate(buf, layout, fullData)
		if err != nil {
			// capture the error and send it back to the client
			res.WriteHeader(500)
			fullData["Description"] = err.Error()
			l.Templates.ExecuteTemplate(res, "500", fullData)
		} else {
			// no error
			if layout == "404" {
				res.WriteHeader(404)
			}
			buf.WriteTo(res)
		}
	}
}
