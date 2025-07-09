# ---------- Stage 1: Build ----------
FROM golang:1.23-alpine AS builder

# Enable Go modules and set working directory
WORKDIR /app

# Copy go mod files and download dependencies first (leverages Docker cache)
COPY go.mod go.sum ./
RUN go mod download

# Copy the full source code
COPY . .

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# ---------- Stage 2: Final Image ----------
FROM alpine:latest

# Create a minimal working directory
WORKDIR /app

# Copy the compiled binary from builder stage
COPY --from=builder /app/main .

# Create directories for runtime needs
RUN mkdir -p /accounts /messages /log /projects /repos /local-deployments

# Set a non-root user for better security (optional but recommended)
# RUN adduser -D appuser
# USER appuser

# Expose the port your service listens on
EXPOSE 5600

# Set entrypoint
CMD ["./main"]