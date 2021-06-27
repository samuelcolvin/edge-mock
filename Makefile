.DEFAULT_GOAL := all

.PHONY: format
format:
	yarn format

.PHONY: lint
lint:
	yarn lint

.PHONY: test
test:
	yarn test

.PHONY: testcov
testcov:
	yarn test --coverage
	@echo "open coverage report with 'chrome coverage/lcov-report/index.html'"

.PHONY: all
all: lint testcov

.PHONY: build
build:
	yarn prepublishOnly

.PHONY: build-pack
build-pack: build
	npm pack
	make clean

.PHONY: clean
clean:
	rm -rf coverage
	rm -rf models
	rm -f *.js
	rm -f *.d.ts
	rm -f *.js.map
