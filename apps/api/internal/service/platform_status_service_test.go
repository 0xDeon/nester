package service

import (
	"context"
	"errors"
	"testing"

	"github.com/suncrestlabs/nester/apps/api/internal/domain/moneypath"
	"github.com/suncrestlabs/nester/apps/api/internal/domain/systemstate"
)

type fakeState map[string]string

func (f fakeState) Get(_ context.Context, key string) (string, error) {
	v, ok := f[key]
	if !ok {
		return "", systemstate.ErrKeyNotFound
	}
	return v, nil
}

func (f fakeState) Set(_ context.Context, key, value string) error {
	f[key] = value
	return nil
}

type fakeSwitches struct {
	switches []moneypath.Switch
	err      error
}

func (f *fakeSwitches) List(context.Context) ([]moneypath.Switch, error) { return f.switches, f.err }

func tip(n uint64, err error) LatestLedgerFunc {
	return func(context.Context) (uint64, error) { return n, err }
}

func TestPlatformStatusHealthy(t *testing.T) {
	svc := NewPlatformStatusService(fakeState{systemstate.KeyLastLedger: "995"}, &fakeSwitches{}, tip(1000, nil))
	got := svc.Status(context.Background())
	if got.DepositsPaused || got.WithdrawalsPaused || !got.RPCHealthy {
		t.Fatalf("unexpected status: %+v", got)
	}
	if got.IndexerLagLedgers == nil || *got.IndexerLagLedgers != 5 {
		t.Fatalf("lag = %v, want 5", got.IndexerLagLedgers)
	}
}

func TestPlatformStatusPauseSwitches(t *testing.T) {
	cases := []struct {
		name                string
		deposit, withdrawal bool
	}{
		{"deposits only", true, false},
		{"withdrawals only", false, true},
		{"both", true, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sw := &fakeSwitches{switches: []moneypath.Switch{
				{Operation: moneypath.OperationDeposit, Paused: tc.deposit},
				{Operation: moneypath.OperationWithdrawal, Paused: tc.withdrawal},
			}}
			got := NewPlatformStatusService(fakeState{}, sw, tip(10, nil)).Status(context.Background())
			if got.DepositsPaused != tc.deposit || got.WithdrawalsPaused != tc.withdrawal {
				t.Fatalf("unexpected status: %+v", got)
			}
		})
	}
}

func TestPlatformStatusRPCDownLeavesLagUnknown(t *testing.T) {
	svc := NewPlatformStatusService(fakeState{systemstate.KeyLastLedger: "5"}, &fakeSwitches{}, tip(0, errors.New("down")))
	got := svc.Status(context.Background())
	if got.RPCHealthy || got.IndexerLagLedgers != nil {
		t.Fatalf("unexpected status: %+v", got)
	}
}

func TestPlatformStatusSourceFailuresDoNotFailEndpoint(t *testing.T) {
	svc := NewPlatformStatusService(fakeState{}, &fakeSwitches{err: errors.New("db down")}, tip(100, nil))
	got := svc.Status(context.Background())
	if !got.RPCHealthy || got.IndexerLagLedgers != nil || got.DepositsPaused {
		t.Fatalf("unexpected status: %+v", got)
	}
}
