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
