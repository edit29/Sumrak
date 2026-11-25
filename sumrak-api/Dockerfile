FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/sumrak-api .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates
COPY --from=builder /out/sumrak-api /usr/local/bin/sumrak-api
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/sumrak-api"]
