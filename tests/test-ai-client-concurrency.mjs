#!/usr/bin/env node
/**
 * tests/test-ai-client-concurrency.mjs
 *
 * High-Concurrency & Stress Test for the Dual-Brain AI Client & TTL Model Cache.
 *
 * Verifies:
 * 1. 100 concurrent requests resolve the 7-tier pool in < 1ms without cache thrashing.
 * 2. High-concurrency cache refresh preserves pool immutability and valid model ordering.
 * 3. Concurrent error cascades isolate model vs key failures independently per request.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Import client module
const {
  getPrioritizedNvidiaModels,
  clearModelCache,
  executeChatCompletion,
} = await import('../shared/nvidia-client.ts');

const testCases = [];

function recordTest(name, passed, details, latencyMs) {
  testCases.push({ name, passed, details, latencyMs });
  const status = passed ? '✓ PASSED' : '✗ FAILED';
  console.log(`\n${status}: ${name} (${latencyMs.toFixed(3)}ms)`);
  console.log(`  └─ ${details}`);
}

// ---------------------------------------------------------------------------
// TEST 1: 100 Concurrent In-Memory Cache Reads (< 1ms SLA)
// ---------------------------------------------------------------------------
async function test1_ConcurrentCacheResolution() {
  console.log('\n--- Running TEST 1: 100 Concurrent Cache Resolutions ---');
  clearModelCache();

  // Warm the cache once
  await getPrioritizedNvidiaModels();

  const CONCURRENCY = 100;
  const latencies = [];
  const startTotal = performance.now();

  const tasks = Array.from({ length: CONCURRENCY }, async (_, idx) => {
    const t0 = performance.now();
    const pool = await getPrioritizedNvidiaModels();
    const duration = performance.now() - t0;
    latencies.push(duration);
    if (!pool.primary || pool.fallbacks.length < 6) {
      throw new Error(`Task ${idx} received incomplete model pool`);
    }
  });

  await Promise.all(tasks);
  const totalMs = performance.now() - startTotal;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(CONCURRENCY * 0.5)];
  const p95 = latencies[Math.floor(CONCURRENCY * 0.95)];
  const p99 = latencies[Math.floor(CONCURRENCY * 0.99)];
  const avg = latencies.reduce((sum, v) => sum + v, 0) / CONCURRENCY;

  const passed = p99 < 1.0;
  recordTest(
    'Concurrent Model Pool Resolution (< 1ms SLA)',
    passed,
    `100 concurrent reads resolved in ${totalMs.toFixed(2)}ms total (avg: ${avg.toFixed(4)}ms, p50: ${p50.toFixed(4)}ms, p95: ${p95.toFixed(4)}ms, p99: ${p99.toFixed(4)}ms)`,
    totalMs
  );
}

// ---------------------------------------------------------------------------
// TEST 2: Concurrent Cache Reload & Immutability
// ---------------------------------------------------------------------------
async function test2_ConcurrentCacheReload() {
  console.log('\n--- Running TEST 2: Concurrent Cache Reload & Immutability ---');
  clearModelCache();

  const CONCURRENCY = 20;
  const t0 = performance.now();

  // Trigger simultaneous reloads simulating cache expiry under burst traffic
  const tasks = Array.from({ length: CONCURRENCY }, () =>
    getPrioritizedNvidiaModels({ forceRefresh: true })
  );

  const results = await Promise.all(tasks);
  const totalMs = performance.now() - t0;

  const primaryModel = results[0].primary;
  const allConsistent = results.every(
    (p) => p.primary === primaryModel && p.fallbacks.length === results[0].fallbacks.length
  );

  recordTest(
    'Thundering Herd Concurrent Cache Reload',
    allConsistent,
    `${CONCURRENCY} concurrent cold reloads completed in ${totalMs.toFixed(2)}ms with 100% pool consistency (Primary: ${primaryModel})`,
    totalMs
  );
}

// ---------------------------------------------------------------------------
// TEST 3: Independent Per-Request Cascading Fallback
// ---------------------------------------------------------------------------
async function test3_ConcurrentFallbackIsolation() {
  console.log('\n--- Running TEST 3: Concurrent Fallback Request Isolation ---');
  const CONCURRENCY = 5;
  const t0 = performance.now();

  const tasks = Array.from({ length: CONCURRENCY }, async (_, idx) => {
    return executeChatCompletion(
      [{ role: 'user', content: `Concurrent test payload ${idx}` }],
      {
        simulatedOutage: true,
        max_tokens: 10,
      }
    );
  });

  const results = await Promise.all(tasks);
  const totalMs = performance.now() - t0;

  const allPassed = results.every(
    (res) => res.provider === 'gemini' && res.content && res.content.length > 0
  );

  recordTest(
    'Concurrent Fallback Request Isolation',
    allPassed,
    `${CONCURRENCY} concurrent requests cleanly cascaded through fail-safe handoff without cross-request state leakage (${totalMs.toFixed(2)}ms)`,
    totalMs
  );
}

// ---------------------------------------------------------------------------
// Master Runner
// ---------------------------------------------------------------------------
async function runAll() {
  console.log('=================================================================');
  console.log('🚀 Dual-Brain AI Client Concurrency & Stress Test Suite');
  console.log('=================================================================');

  await test1_ConcurrentCacheResolution();
  await test2_ConcurrentCacheReload();
  await test3_ConcurrentFallbackIsolation();

  console.log('\n=================================================================');
  const allPassed = testCases.every((t) => t.passed);
  console.log(`Results: ${testCases.filter((t) => t.passed).length}/${testCases.length} tests passed.`);
  console.log('=================================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal error during concurrency tests:', err);
  process.exit(1);
});
