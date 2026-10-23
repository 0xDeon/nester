package handler

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/suncrestlabs/nester/apps/api/internal/middleware"
	"github.com/suncrestlabs/nester/apps/api/internal/service"
	"github.com/suncrestlabs/nester/apps/api/pkg/response"
)

type StatusProvider interface {
	Status(ctx context.Context) service.PlatformStatus
}

type StatusHandler struct {
	provider StatusProvider
	ttl      time.Duration
	limit    int
	window   time.Duration

	mu        sync.Mutex
	cached    service.PlatformStatus
	expiresAt time.Time
}

// NewStatusHandler serves GET /api/v1/status. Results are cached in-process
// for ttl and requests are limited to limit per window per client IP.
func NewStatusHandler(provider StatusProvider, ttl time.Duration, limit int, window time.Duration) *StatusHandler {
	return &StatusHandler{provider: provider, ttl: ttl, limit: limit, window: window}
}

func (h *StatusHandler) Register(mux *http.ServeMux) {
	limiter := middleware.IPRateLimiter(h.limit, h.window)
	mux.Handle("GET /api/v1/status", limiter(http.HandlerFunc(h.getStatus)))
}

func (h *StatusHandler) current(ctx context.Context) service.PlatformStatus {
	h.mu.Lock()
	defer h.mu.Unlock()
	if time.Now().Before(h.expiresAt) {
		return h.cached
	}
	status := h.provider.Status(ctx)
	status.GeneratedAt = time.Now().UTC()
	h.cached = status
	h.expiresAt = time.Now().Add(h.ttl)
	return status
}

func (h *StatusHandler) getStatus(w http.ResponseWriter, r *http.Request) {
	status := h.current(r.Context())
	w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", int(h.ttl.Seconds())))
	response.WriteJSON(w, http.StatusOK, response.OK(status))
}
