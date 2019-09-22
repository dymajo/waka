package main

import (
	"html/template"
	"net/http"
)

type Layout struct {
	templateMap map[string]*template.Template
}

func NewLayout() *Layout {
	return &Layout{make(map[string]*template.Template)}
}

func (l Layout) Parse() {
	var header string = "./templates/header.html"
	var footer string = "./templates/footer.html"
	l.templateMap["page"] = template.Must(template.ParseFiles("./templates/page.html", header, footer))
}

func (l Layout) Handler(layout string) func(http.ResponseWriter, *http.Request) {
	return func(res http.ResponseWriter, req *http.Request) {
		fullData := map[string]interface{}{
			"Title": "Waka",
		}
		l.templateMap["page"].ExecuteTemplate(res, "page", fullData)
	}
}