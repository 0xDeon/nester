package service

import (
	"context"
	"strconv"
	"time"

	"github.com/suncrestlabs/nester/apps/api/internal/domain/moneypath"
	"github.com/suncrestlabs/nester/apps/api/internal/domain/systemstate"
)

// PlatformStatus is the public incident snapshot consumed by the dapp's
// degraded-mode banner. It deliberately contains no per-user data.
type PlatformStatus struct {
	DepositsPaused    bool `json:"deposits_paused"`
	WithdrawalsPaused bool `json:"withdrawals_paused"`
	// IndexerLagLedgers is nil when the lag cannot be determined.
	IndexerLagLedgers *uint64   `json:"indexer_lag_ledgers"`
	RPCHealthy        bool      `json:"rpc_healthy"`
	GeneratedAt       time.Time `json:"generated_at"`
}

type pauseSwitchLister interface {
	List(ctx context.Context) ([]moneypath.Switch, error)
}

// LatestLedgerFunc returns the chain tip as seen by the RPC node.
type LatestLedgerFunc func(ctx context.Context) (uint64, error)

// PlatformStatusService assembles the public status snapshot. Every source is
// best-effort: a failing source degrades its own field and never the endpoint.
type PlatformStatusService struct {
	state    systemstate.Repository
	switches pauseSwitchLister
	latest   LatestLedgerFunc
}

func NewPlatformStatusService(state systemstate.Repository, switches pauseSwitchLister, latest LatestLedgerFunc) *PlatformStatusService {
	return &PlatformStatusService{state: state, switches: switches, latest: latest}
}

func (s *PlatformStatusService) Status(ctx context.Context) PlatformStatus {
	var out PlatformStatus

	if switches, err := s.switches.List(ctx); err == nil {
		for _, sw := range switches {
			switch sw.Operation {
			case moneypath.OperationDeposit:
				out.DepositsPaused = sw.Paused
			case moneypath.OperationWithdrawal:
				out.WithdrawalsPaused = sw.Paused
			}
		}
	}

	tip, err := s.latest(ctx)
	if err != nil || tip == 0 {
		return out
	}
	out.RPCHealthy = true

	raw, err := s.state.Get(ctx, systemstate.KeyLastLedger)
	if err != nil {
		return out
	}
	last, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		return out
	}
	var lag uint64
	if tip > last {
		lag = tip - last
	}
	out.IndexerLagLedgers = &lag
	return out
}
