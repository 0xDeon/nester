//go:build !windows

package service

import (
	"fmt"
	"syscall"
)

func diskUsage() string {
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		return "n/a"
	}
	total := stat.Blocks * uint64(stat.Bsize) // #nosec G115 -- Bsize is a block size, always non-negative
	free := stat.Bavail * uint64(stat.Bsize)  // #nosec G115 -- Bsize is a block size, always non-negative
	used := total - free
	if total == 0 {
		return "n/a"
	}
	usedPct := (float64(used) / float64(total)) * 100
	return fmt.Sprintf("%.1f%%", usedPct)
}
