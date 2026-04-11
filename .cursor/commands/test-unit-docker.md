---
description: Run backend unit tests using Docker
allowed-tools: Bash(docker:*), Bash(docker compose:*), Read
---

# Run Unit Tests with Docker

Execute backend unit tests in an isolated Docker environment using the test stack.

## Prerequisites

- Docker and Docker Compose installed
- Test environment containers available

## Quick Start

### 1. Start Test Environment

First, ensure the test environment is running:

```bash
docker compose -f compose.test.yaml up -d
```

Wait for services to be healthy (about 15-30 seconds):

```bash
docker compose -f compose.test.yaml ps
```

### 2. Run All Unit Tests

```bash
docker exec voya-test-backend pytest tests/unit_tests/ -v
```

### 3. Run Specific Test File

```bash
docker exec voya-test-backend pytest tests/unit_tests/test_domains/test_hotel/test_hotel_service.py -v
```

### 4. Run Specific Test Class or Method

```bash
# Run a specific test class
docker exec voya-test-backend pytest tests/unit_tests/test_domains/test_hotel/test_hotel_service.py::TestSearchHotels -v

# Run a specific test method
docker exec voya-test-backend pytest tests/unit_tests/test_domains/test_hotel/test_hotel_service.py::TestSearchHotels::test_search_hotels_geolocation -v
```

## Common Commands

### Run with Coverage

```bash
docker exec voya-test-backend pytest tests/unit_tests/ -v --cov=app --cov-report=term-missing
```

### Run with Verbose Output and No Coverage

```bash
docker exec voya-test-backend pytest tests/unit_tests/ -v --no-cov
```

### Run Tests Matching a Pattern

```bash
docker exec voya-test-backend pytest tests/unit_tests/ -k "hotel" -v
```

### Run Tests and Stop on First Failure

```bash
docker exec voya-test-backend pytest tests/unit_tests/ -v -x
```

### Clear Python Cache (if tests seem stale)

```bash
docker exec voya-test-backend find /app -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
docker exec voya-test-backend rm -rf /app/.pytest_cache 2>/dev/null || true
```

## Important Notes

1. **Test Path**: Pytest runs from `/app` directory and uses `tests/unit_tests/` path (not `/app/backend/tests/`). The test files are located at `/app/tests/unit_tests/` in the container.

2. **Container Name**: The backend test container is named `voya-test-backend`.

3. **Test Environment**: The test environment uses:

   - Separate database: `voya_test` on port `27018`
   - Separate backend API on port `8001`
   - MailHog for email testing on port `8026`
   - FlightLogic mock server on port `8004`

4. **Restarting Container**: If you make code changes and tests seem stale, restart the container:

   ```bash
   docker compose -f compose.test.yaml restart backend-test
   ```

5. **Stopping Test Environment**: When done testing:
   ```bash
   docker compose -f compose.test.yaml down
   ```

## Troubleshooting

### Tests Fail with "Check-in date cannot be in the past"

This usually means test fixtures have hardcoded dates that are now in the past. Update the dates in the test file to future dates (preferably February of next year).

### Tests Not Picking Up Code Changes

1. Clear Python cache (see commands above)
2. Restart the backend container:
   ```bash
   docker compose -f compose.test.yaml restart backend-test
   ```
3. Wait 10-15 seconds for the container to be healthy

### Container Not Found

Ensure the test environment is running:

```bash
docker compose -f compose.test.yaml up -d
```

Check container status:

```bash
docker compose -f compose.test.yaml ps
```

## Example: Full Test Run

```bash
# Start test environment
docker compose -f compose.test.yaml up -d

# Wait for services
sleep 15

# Run all unit tests
docker exec voya-test-backend pytest tests/unit_tests/ -v --tb=short

# Check results
echo "Tests completed. Check output above for results."
```

## Example: Quick Test of Specific Module

```bash
# Run hotel service tests only
docker exec voya-test-backend pytest tests/unit_tests/test_domains/test_hotel/ -v --tb=no -q
```
