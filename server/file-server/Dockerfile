# ---------- Stage 1: Build ----------
FROM golang:1.24.4-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .
COPY --from=builder /app/AccountIcon.svg .
COPY --from=builder /app/AccountIcon.png .

# Create shared volume directories and other necessary directories
RUN mkdir -p /shared_data/accounts /shared_data/messages /shared_data/projects /log /tmp 

EXPOSE 5600

# Set entrypoint
CMD ["./main"]