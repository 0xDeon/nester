package cache

import "time"

// ExportedJitteredTTL exports jitteredTTL for unit testing within cache_test.
func ExportedJitteredTTL(base time.Duration) time.Duration {
	return jitteredTTL(base)
}

// JitterFraction is exported for test assertions.
const JitterFraction = jitterFraction
