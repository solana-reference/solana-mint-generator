.PHONY: install build start test stop

all: install build start test stop

install:
	yarn install

build:
	anchor build
	yarn idl:generate && yarn lint && yarn build

start:
	solana-test-validator --url https://api.mainnet-beta.solana.com \
		--clone metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s --clone PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT \
		--clone auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg --clone BXPrcDXuxa4G7m5qj4hu9Fs48sAPJqsjK5Y5S8qxH44J \
		--clone cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK --clone 4VTQredsAmr1yzRJugLV6Mt6eu6XMeCwdkZ73wwVMWHv \
		--clone BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY --clone BuBmqo7ehiQf5svTpw54air9bveqqFZQV9BjX277rqm7 \
		--clone noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV --clone 3RHkdjCwWyK2firrwFQGvXCxbUpBky1GTmb9EDK9hUnX \
		--bpf-program mintjBhypUqvbKvCePPsQN55AYBY3DwFWpuR5PDURdH ./target/deploy/mint_generator.so \
		--reset --quiet & echo $$!
	sleep 10

test:
	yarn test

stop:
	pkill solana-test-validator