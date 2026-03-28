.PHONY: migrate-up migrate-down migrate-create

DATABASE_DSN ?= postgres://postgres:password@localhost:5432/nester_dev?sslmode=disable

migrate-up:
	migrate -path ./migrations -database "$(DATABASE_DSN)" up

migrate-down:
	@if [ -z "$(steps)" ]; then \
		echo "Usage: make migrate-down steps=<number_of_steps>"; \
		exit 1; \
	fi
	migrate -path ./migrations -database "$(DATABASE_DSN)" down $(steps)

migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migrate-create name=<migration_name>"; \
		exit 1; \
	fi
	migrate create -ext sql -dir ./migrations -seq $(name)
