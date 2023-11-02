FROM golang:alpine AS builder

WORKDIR /build
COPY . .
RUN go mod tidy && go build -o dist/ ./cmd/...

FROM alpine

EXPOSE 8080/tcp
EXPOSE 8088/tcp
EXPOSE 8446/tcp
EXPOSE 8999/tcp
EXPOSE 8999/udp

WORKDIR /app
COPY --from=builder /build/dist/goatak_server /app/goatak_server
COPY ./data /app/data
COPY ./goatak_server.yml /app/
COPY ./users.yml /app/
CMD ["./goatak_server"]