# Playwright Test Report

Status: failed
Started: 2026-05-28T18:01:02.181Z
Finished: 2026-05-28T18:01:14.896Z

## Summary

- Total: 3
- Passed: 2
- Failed: 1
- Timed out: 0
- Skipped: 0

## Tests

### PASSED - chromium > example.spec.ts > basic sanity check

Location: tests/example.spec.ts:3:1
Duration: 4120ms

### PASSED - chromium > example.spec.ts > search button should be visible

Location: tests/example.spec.ts:10:1
Duration: 1704ms

### FAILED - chromium > example.spec.ts > intentional failure test

Location: tests/example.spec.ts:18:1
Duration: 6038ms

Error:
```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /NonExistentTitle/
Received string:  "Airbnb | Holiday rentals, cabins, beach houses & more"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    14 × unexpected value "Airbnb | Holiday rentals, cabins, beach houses & more"

```

Artifacts:
- [error-context](../test-results/example-intentional-failure-test-chromium/error-context.md)
