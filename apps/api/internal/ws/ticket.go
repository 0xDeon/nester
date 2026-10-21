package ws

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	ticketTTL    = 30 * time.Second
	ticketPrefix = "ws:ticket:"
)

// TicketStore issues and redeems single-use, short-lived WS auth tickets.
// A ticket encodes the user's identity so ServeWs never needs a long-lived
// JWT in the URL query string.
type TicketStore interface {
	// Issue mints a new ticket tied to userID and sessionID.
	Issue(ctx context.Context, userID, sessionID string) (ticket string, err error)
	// Redeem exchanges a ticket for the stored identity. It is single-use:
	// a second call with the same ticket returns ErrTicketNotFound.
	Redeem(ctx context.Context, ticket string) (userID, sessionID string, err error)
}

// ErrTicketNotFound is returned when a ticket is missing, expired, or already used.
var ErrTicketNotFound = fmt.Errorf("ws ticket not found or already used")

// redisTicketStore is a TicketStore backed by Redis.
type redisTicketStore struct {
	rc *redis.Client
}

// NewRedisTicketStore creates a TicketStore that uses rc.
func NewRedisTicketStore(rc *redis.Client) TicketStore {
	return &redisTicketStore{rc: rc}
}

func (s *redisTicketStore) Issue(ctx context.Context, userID, sessionID string) (string, error) {
	ticket, err := randomHex(32)
	if err != nil {
		return "", fmt.Errorf("ws: generate ticket: %w", err)
	}
	val := userID + "\n" + sessionID
	if err := s.rc.Set(ctx, ticketPrefix+ticket, val, ticketTTL).Err(); err != nil {
		return "", fmt.Errorf("ws: store ticket: %w", err)
	}
	return ticket, nil
}

func (s *redisTicketStore) Redeem(ctx context.Context, ticket string) (string, string, error) {
	key := ticketPrefix + ticket
	val, err := s.rc.GetDel(ctx, key).Result()
	if err == redis.Nil {
		return "", "", ErrTicketNotFound
	}
	if err != nil {
		return "", "", fmt.Errorf("ws: redeem ticket: %w", err)
	}
	parts := splitTwo(val)
	return parts[0], parts[1], nil
}

// memTicketStore is an in-process TicketStore for environments without Redis.
type memTicketStore struct {
	mu      sync.Mutex
	entries map[string]memTicket
}

type memTicket struct {
	userID    string
	sessionID string
	expiresAt time.Time
}

// NewMemTicketStore returns an in-memory TicketStore (single-instance only).
func NewMemTicketStore() TicketStore {
	return &memTicketStore{entries: make(map[string]memTicket)}
}

func (s *memTicketStore) Issue(_ context.Context, userID, sessionID string) (string, error) {
	ticket, err := randomHex(32)
	if err != nil {
		return "", fmt.Errorf("ws: generate ticket: %w", err)
	}
	s.mu.Lock()
	s.entries[ticket] = memTicket{userID: userID, sessionID: sessionID, expiresAt: time.Now().Add(ticketTTL)}
	s.mu.Unlock()
	return ticket, nil
}

func (s *memTicketStore) Redeem(_ context.Context, ticket string) (string, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[ticket]
	if !ok || time.Now().After(e.expiresAt) {
		delete(s.entries, ticket)
		return "", "", ErrTicketNotFound
	}
	delete(s.entries, ticket)
	return e.userID, e.sessionID, nil
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// splitTwo splits s on the first '\n' and returns a two-element slice.
func splitTwo(s string) [2]string {
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			return [2]string{s[:i], s[i+1:]}
		}
	}
	return [2]string{s, ""}
}
