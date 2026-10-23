// Command config-doc generates docs/api-config.md, the operator reference for
// every environment variable the API reads, from the config loader itself.
//
// Usage:
//
//	go run ./cmd/config-doc > ../../docs/api-config.md
//	go run ./cmd/config-doc -check ../../docs/api-config.md
//
// -check compares the freshly generated reference against the given file and
// exits non-zero if they differ, without writing anything — this is what CI
// runs to catch a stale committed doc.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/suncrestlabs/nester/apps/api/internal/config"
)

func main() {
	checkPath := flag.String("check", "", "path to an existing doc to diff against, instead of printing to stdout")
	flag.Parse()

	generated := config.RenderMarkdown(config.Describe())

	if *checkPath == "" {
		if _, err := os.Stdout.WriteString(generated); err != nil {
			fmt.Fprintf(os.Stderr, "config-doc: writing to stdout: %v\n", err)
			os.Exit(1)
		}
		return
	}

	committed, err := os.ReadFile(*checkPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "config-doc: reading %s: %v\n", *checkPath, err)
		os.Exit(1)
	}

	if string(committed) != generated {
		fmt.Fprintf(os.Stderr, "config-doc: %s is stale — the committed reference no longer matches the config loader.\n", *checkPath)
		fmt.Fprintf(os.Stderr, "Run: go run ./cmd/config-doc > %s\n", *checkPath)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "config-doc: %s is up to date\n", *checkPath)
}
