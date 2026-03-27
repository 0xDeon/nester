package handler

import (
	"net/http"

	"github.com/Suncrest-Labs/nester/internal/service"
	"github.com/Suncrest-Labs/nester/pkg/response"
	"github.com/go-chi/chi/v5"
)

type IntelligenceHandler struct {
	prometheus *service.PrometheusClient
}

func NewIntelligenceHandler(prometheus *service.PrometheusClient) *IntelligenceHandler {
	return &IntelligenceHandler{
		prometheus: prometheus,
	}
}

func (h *IntelligenceHandler) GetVaultRecommendations(w http.ResponseWriter, r *http.Request) {
	vaultID := chi.URLParam(r, "id")
	if vaultID == "" {
		response.Error(w, http.StatusBadRequest, "vault id is required")
		return
	}

	recs, err := h.prometheus.GetVaultRecommendations(r.Context(), vaultID)
	if err != nil {
		// Should not happen as PrometheusClient handles errors gracefully
		response.Error(w, http.StatusInternalServerError, "failed to fetch recommendations")
		return
	}

	response.JSON(w, http.StatusOK, recs)
}

func (h *IntelligenceHandler) GetMarketSentiment(w http.ResponseWriter, r *http.Request) {
	report, err := h.prometheus.GetMarketSentiment(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to fetch market sentiment")
		return
	}

	response.JSON(w, http.StatusOK, report)
}

func (h *IntelligenceHandler) GetPortfolioInsights(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	if userID == "" {
		response.Error(w, http.StatusBadRequest, "user id is required")
		return
	}

	insights, err := h.prometheus.GetPortfolioInsights(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to fetch portfolio insights")
		return
	}

	response.JSON(w, http.StatusOK, insights)
}
