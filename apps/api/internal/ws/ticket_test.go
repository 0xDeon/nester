package ws

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestMemTicketStore_IssueAndRedeem(t *testing.T) {
	store := NewMemTicketStore()
	ctx := context.Background()

	ticket, err := store.Issue(ctx, "user-1", "sess-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if ticket == "" {
		t.Fatal("Issue returned empty ticket")
	}

	uid, sid, err := store.Redeem(ctx, ticket)
	if err != nil {
		t.Fatalf("Redeem: %v", err)
	}
	if uid != "user-1" || sid != "sess-1" {
		t.Fatalf("Redeem returned wrong identity: uid=%q sid=%q", uid, sid)
	}
}

func TestMemTicketStore_SingleUse(t *testing.T) {
	store := NewMemTicketStore()
	ctx := context.Background()

	ticket, _ := store.Issue(ctx, "user-2", "sess-2")
	_, _, _ = store.Redeem(ctx, ticket)

	_, _, err := store.Redeem(ctx, ticket)
	if err != ErrTicketNotFound {
		t.Fatalf("second Redeem should return ErrTicketNotFound, got: %v", err)
	}
}

func TestMemTicketStore_Expiry(t *testing.T) {
	store := NewMemTicketStore()
	ctx := context.Background()

	ticket, _ := store.Issue(ctx, "user-3", "sess-3")

	// Force-expire the entry by backdating it.
	ms := store.(*memTicketStore)
	ms.mu.Lock()
	e := ms.entries[ticket]
	e.expiresAt = time.Now().Add(-time.Second)
	ms.entries[ticket] = e
	ms.mu.Unlock()

	_, _, err := store.Redeem(ctx, ticket)
	if err != ErrTicketNotFound {
		t.Fatalf("expired ticket should return ErrTicketNotFound, got: %v", err)
	}
}

func TestMemTicketStore_UnknownTicket(t *testing.T) {
	store := NewMemTicketStore()
	_, _, err := store.Redeem(context.Background(), "does-not-exist")
	if err != ErrTicketNotFound {
		t.Fatalf("expected ErrTicketNotFound, got: %v", err)
	}
}

func TestHub_ServeWs_RejectsLongLivedToken(t *testing.T) {
	hub := newTestHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	srv := httptest.NewServer(http.HandlerFunc(hub.ServeWs))
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws?token=some-jwt"
	_, resp, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	if resp == nil || resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for legacy ?token= param, got %v", resp)
	}
}

func TestHub_ServeWs_AcceptsValidTicket(t *testing.T) {
	hub := newTestHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	srv := httptest.NewServer(http.HandlerFunc(hub.ServeWs))
	defer srv.Close()

	ticket, err := hub.IssueTicket(context.Background(), "user-99", "sess-99")
	if err != nil {
		t.Fatalf("IssueTicket: %v", err)
	}

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws?wsticket=" + ticket
	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("WS dial: %v (status %v)", err, resp)
	}
	conn.Close()
}

func TestHub_ServeWs_RejectsUsedTicket(t *testing.T) {
	hub := newTestHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	srv := httptest.NewServer(http.HandlerFunc(hub.ServeWs))
	defer srv.Close()

	ticket, _ := hub.IssueTicket(context.Background(), "user-x", "sess-x")
	// Consume the ticket first.
	_, _, _ = hub.tickets.Redeem(context.Background(), ticket)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws?wsticket=" + ticket
	_, resp, _ := websocket.DefaultDialer.Dial(wsURL, nil)
	if resp == nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for used ticket, got %v", resp)
	}
}
