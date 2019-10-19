package main

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sns"
	"github.com/sirupsen/logrus"
)

// Feedback is for our customer feedback
type Feedback struct {
	topicArn  string
	snsClient *sns.SNS
}

// FeedbackItem is received from the client, and then sent to SNS
type FeedbackItem struct {
	Type      string `json:"type"`
	URL       string `json:"url"`
	Message   string `json:"message"`
	Contact   string `json:"contact"`
	UserAgent string `json:"userAgent"`
}

// FeedbackResponse is our return HTTP response
type FeedbackResponse struct {
	Status string `json:"status"`
}

// NewFeedback returns a new instance of Feedback
func NewFeedback() *Feedback {
	region := os.Getenv("AWS_REGION")
	topicArn := os.Getenv("FEEDBACK_SNS_TOPIC_ARN")
	if region == "" || topicArn == "" {
		logrus.Warn("Won't send feedback to SNS - AWS_REGION and FEEDBACK_SNS_TOPIC_ARN not specified.")
		return &Feedback{
			snsClient: nil,
		}
	}

	awsSession, err := session.NewSession(&aws.Config{
		Region: aws.String(region),
	})

	if err != nil {
		logrus.Fatal("Could not create AWS Session", err)
	}

	return &Feedback{
		topicArn:  topicArn,
		snsClient: sns.New(awsSession),
	}
}

// Handler is our POST request
func (f Feedback) Handler() func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		var feedbackItem FeedbackItem
		response := FeedbackResponse{}

		err := json.NewDecoder(r.Body).Decode(&feedbackItem)

		if err != nil {
			w.WriteHeader(400)
			response.Status = "Could not decode JSON"
		} else if feedbackItem.Type != "error-report" {
			w.WriteHeader(400)
			response.Status = "Invalid type - only 'error-report' is valid."
		} else if feedbackItem.Message == "" {
			w.WriteHeader(400)
			response.Status = "Please include a message in your feedback."
		} else {
			feedbackItem.UserAgent = r.UserAgent()
			response.Status = f.SendToSNS(feedbackItem)

			if response.Status != "Success" {
				w.WriteHeader(500)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// SendToSNS sends our Payload to AWS
func (f Feedback) SendToSNS(feedbackItem FeedbackItem) string {
	if f.snsClient == nil {
		return "No SNS Topic Configured"
	}

	message, err := json.MarshalIndent(feedbackItem, "", "    ")
	if err != nil {
		return "Could not encode JSON"
	}

	input := &sns.PublishInput{
		Message:  aws.String(string(message)),
		TopicArn: aws.String(f.topicArn),
	}

	result, err := f.snsClient.Publish(input)
	if err != nil {
		logrus.WithError(err).Infof("Failed to deliver to SNS")
		return "Could not Publish to SNS"
	}

	logrus.WithField("snsMessageId", result.MessageId).Infof("Delivered Message to SNS")
	return "Success"
}
