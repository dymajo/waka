package main

import (
	"bytes"
	"encoding/json"
	"html/template"
	"io/ioutil"
	"net/http"
	"os"

	"github.com/sirupsen/logrus"
)

// Layout serves our HTML templates
type Layout struct {
	Templates   *template.Template
	Assets      map[string]string
	AssetPrefix string
}

// NewLayout return a new Layout, with all the templates loaded in
func NewLayout(assetPath string, assetPrefix string) *Layout {
	layout := &Layout{}

	layout.AssetPrefix = assetPrefix
	jsonFile, err := os.Open(assetPath)
	if err != nil {
		logrus.Fatal(err)
	}
	defer jsonFile.Close()
	byteValue, _ := ioutil.ReadAll(jsonFile)
	json.Unmarshal(byteValue, &layout.Assets)
	logrus.Infof("Loaded JSON Assets")

	layout.Templates = template.Must(
		template.New("").Funcs(template.FuncMap{
			"WrapHeader": layout.WrapHeader,
			"WrapFooter": layout.WrapFooter,
		}).ParseGlob("./templates/*.html"))
	logrus.Infof("Loaded HTML Templates")

	return layout
}

// WrapHeader passes in a few bits of metadata into the header HTML section
func (l Layout) WrapHeader(title string, description string) map[string]interface{} {
	return map[string]interface{}{
		"Title":       title,
		"Description": description,
		"CSSPath":     l.AssetPrefix + l.Assets["app.css"],
	}
}

// WrapFooter passes in metadata to our footer section
func (l Layout) WrapFooter() map[string]interface{} {
	return map[string]interface{}{
		"VendorPath":    l.AssetPrefix + l.Assets["vendor.js"],
		"MainPath":      l.AssetPrefix + l.Assets["app.js"],
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
			logrus.Error(err)
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
