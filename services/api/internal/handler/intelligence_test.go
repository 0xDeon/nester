package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Suncrest-Labs/nester/internal/config"
	"github.com/Suncrest-Labs/nester/internal/domain/intelligence"
	"github.com/Suncrest-Labs/nester/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
)

func TestIntelligenceHandler_GetVaultRecommendations(t *testing.T) {
	// Mock Prometheus server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recs := []intelligence.Recommendation{{Title: "Rebalance Suggesion"}}
		json.NewEncoder(w).Encode(recs)
	}))
	defer ts.Close()

	cfg := config.PrometheusConfig{BaseURL: ts.URL}
	client := service.NewPrometheusClient(cfg)
	h := NewIntelligenceHandler(client)

	r := chi.NewRouter()
	r.Get("/vaults/{id}/recommendations", h.GetVaultRecommendations)

	req := httptest.NewRequest("GET", "/vaults/v1/recommendations", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var recs []intelligence.Recommendation
	err := json.Unmarshal(w.Body.Bytes(), &recs)
	assert.NoError(t, err)
	assert.Len(t, recs, 1)
	assert.Equal(t, "Rebalance Suggesion", recs[0].Title)
}

func TestIntelligenceHandler_GetMarketSentiment(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		report := intelligence.SentimentReport{Summary: "Bullish"}
		json.NewEncoder(w).Encode(report)
	}))
	defer ts.Close()

	cfg := config.PrometheusConfig{BaseURL: ts.URL}
	client := service.NewPrometheusClient(cfg)
	h := NewIntelligenceHandler(client)

	req := httptest.NewRequest("GET", "/intelligence/market", nil)
	w := httptest.NewRecorder()

	h.GetMarketSentiment(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var report intelligence.SentimentReport
	err := json.Unmarshal(w.Body.Bytes(), &report)
	assert.NoError(t, err)
	assert.Equal(t, "Bullish", report.Summary)
}
