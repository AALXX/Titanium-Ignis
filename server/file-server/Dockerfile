# Stage 1: Build the Go application
FROM golang:1.23-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy dependency files and download them
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire source code
COPY . .

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Stage 2: Create a lightweight image for running the app
FROM alpine:latest

# Set working directory
WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/main .

# (Optional) Create needed directories
RUN mkdir -p /accounts

# Expose the application's port
EXPOSE 5600

# Run the compiled Go binary
CMD ["./main"]
