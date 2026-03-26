package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Suncrest-Labs/nester/internal/config"
	"github.com/Suncrest-Labs/nester/internal/handler"
	"github.com/Suncrest-Labs/nester/internal/service"
)

func main() {
	cfg := config.Load()

	health := handler.NewHealthHandler()
	prometheus := service.NewPrometheusClient(cfg.Prometheus)
	intelligence := handler.NewIntelligenceHandler(prometheus)

	router := handler.NewRouter(cfg, health, intelligence)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("server starting on :%s", cfg.Port)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	health.SetReady(true)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("shutdown signal received, gracefully stopping server")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("server shutdown failed: %v", err)
	}

	log.Println("server stopped")
}
