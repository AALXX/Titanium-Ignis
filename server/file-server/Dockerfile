
# Start from the official Golang image
FROM golang:1.23-alpine as builder

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files to the workspace
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code from the current directory to the Working Directory inside the container
COPY . .

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Use a smaller base image for the final stage
FROM alpine:latest  

# Set working directory to /app
WORKDIR /app/

# Copy the compiled binary from builder stage
COPY --from=builder /app/main .

# Create any needed dirs (like for logs or volumes)
RUN mkdir -p /accounts

# Expose port
EXPOSE 5600

# Run the binary
CMD ["./main"]