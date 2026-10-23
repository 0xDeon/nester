package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/suncrestlabs/nester/apps/api/internal/service"
)

type fakeStatusProvider struct {
	calls  atomic.Int32
	status service.PlatformStatus
}

func (f *fakeStatusProvider) Status(_ context.Context) service.PlatformStatus {
	f.calls.Add(1)
	return f.status
}

func newStatusMux(h *StatusHandler) *http.ServeMux {
	mux := http.NewServeMux()
	h.Register(mux)
	return mux
}

func TestStatusHandlerReturnsPlatformStatus(t *testing.T) {
	lag := uint64(7)
	p := &fakeStatusProvider{status: service.PlatformStatus{
		DepositsPaused:    true,
		IndexerLagLedgers: &lag,
		RPCHealthy:        true,
	}}
	mux := newStatusMux(NewStatusHandler(p, time.Minute, 100, time.Minute))

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/status", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Cache-Control"); got == "" {
		t.Fatalf("Cache-Control header missing")
	}
	var body struct {
		Success bool                   `json:"success"`
		Data    service.PlatformStatus `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if !body.Success || !body.Data.DepositsPaused || body.Data.WithdrawalsPaused || !body.Data.RPCHealthy {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}
	if body.Data.IndexerLagLedgers == nil || *body.Data.IndexerLagLedgers != 7 {
		t.Fatalf("indexer lag not returned: %s", rec.Body.String())
	}
}

func TestStatusHandlerCachesProviderResult(t *testing.T) {
	p := &fakeStatusProvider{}
	mux := newStatusMux(NewStatusHandler(p, time.Minute, 100, time.Minute))

	for i := 0; i < 5; i++ {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/status", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
	}
	if got := p.calls.Load(); got != 1 {
		t.Fatalf("provider called %d times, want 1", got)
	}
}

func TestStatusHandlerRefreshesAfterTTL(t *testing.T) {
	p := &fakeStatusProvider{}
	h := NewStatusHandler(p, time.Millisecond, 100, time.Minute)
	mux := newStatusMux(h)

	mux.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/v1/status", nil))
	time.Sleep(5 * time.Millisecond)
	mux.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/v1/status", nil))

	if got := p.calls.Load(); got != 2 {
		t.Fatalf("provider called %d times, want 2", got)
	}
}

func TestStatusHandlerIsRateLimited(t *testing.T) {
	p := &fakeStatusProvider{}
	mux := newStatusMux(NewStatusHandler(p, time.Minute, 2, time.Minute))

	codes := make([]int, 0, 3)
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/status", nil)
		req.RemoteAddr = "203.0.113.9:1234"
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		codes = append(codes, rec.Code)
	}
	if codes[0] != http.StatusOK || codes[1] != http.StatusOK || codes[2] != http.StatusTooManyRequests {
		t.Fatalf("codes = %v, want [200 200 429]", codes)
	}
}
