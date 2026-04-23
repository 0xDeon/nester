package service

import (
	"context"

	"github.com/suncrestlabs/nester/apps/api/internal/stellar"
)

// SorobanVaultChainInvoker implements VaultChainInvoker by submitting
// InvokeHostFunction transactions to the Soroban RPC node.
type SorobanVaultChainInvoker struct {
	invoker *stellar.ContractInvoker
}

func NewSorobanVaultChainInvoker(
	rpcURL, horizonURL, networkPassphrase, operatorSecret string,
) (*SorobanVaultChainInvoker, error) {
	inv, err := stellar.NewContractInvoker(rpcURL, horizonURL, networkPassphrase, operatorSecret)
	if err != nil {
		return nil, err
	}
	return &SorobanVaultChainInvoker{invoker: inv}, nil
}

func (s *SorobanVaultChainInvoker) PauseVault(ctx context.Context, contractAddress string) error {
	return s.invoker.InvokeVoidFunction(ctx, contractAddress, "pause")
}

func (s *SorobanVaultChainInvoker) UnpauseVault(ctx context.Context, contractAddress string) error {
	return s.invoker.InvokeVoidFunction(ctx, contractAddress, "unpause")
}
