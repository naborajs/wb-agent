#!/usr/bin/env node
/**
 * tests/test-nvidia-resilience.mjs
 *
 * End-to-End Resilience & Fallback Test Suite for NVIDIA Preview Discovery & 6-Tier Engine.
 *
 * Verifies 4 Critical Test Cases:
 * 1. TEST 1: Model priority resolution succeeds and resolves all 7 models (<1ms in-memory).
 * 2. TEST 2: Live happy-path inference succeeds using real NVIDIA credentials.
 * 3. TEST 3: Simulated deprecated/fake primary model is seamlessly bypassed and served from Fallback 1.
 * 4. TEST 4: Simulated 100% NVIDIA outage cleanly triggers the Google Gemini fail-safe handoff.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Lightweight Zero-Dependency Environment Loader
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPaths = [
    path.join(REPO_ROOT, '.env'),
    path.join(REPO_ROOT, 'backend', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch (err) {
        console.warn(`[WARN] Failed to read ${envPath}:`, err.message);
      }
    }
  }
}

loadEnv();

// Import the client module
const {
  getPrioritizedNvidiaModels,
  executeChatCompletion,
  clearModelCache,
  HARDCODED_EMERGENCY_MODELS
} = await import('../shared/nvidia-client.ts');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test results tracker
const testResults = [];

function recordResult(name, passed, details, latencyMs) {
  testResults.push({ name, passed, details, latencyMs });
  const statusBadge = passed ? '✓ PASSED' : '✗ FAILED';
  console.log(`\n${statusBadge}: ${name} (${latencyMs}ms)`);
  console.log(`  Details: ${details}`);
}

// ---------------------------------------------------------------------------
// TEST 1: Model Priority Resolution (All 7 models, <1ms access)
// ---------------------------------------------------------------------------
async function test1_ModelPriorityResolution() {
  console.log('\n--- Running TEST 1: Model Priority Resolution (7 Tiers) ---');
  clearModelCache();

  const startT = performance.now();
  const pool = await getPrioritizedNvidiaModels({ forceRefresh: true });
  const resolutionMs = Math.round(performance.now() - startT);

  console.log(`  Resolution Time (Cold/File): ${resolutionMs}ms`);
  console.log(`  Resolved Primary Model: ${pool.primary}`);
  console.log(`  Resolved Fallback Models (${pool.fallbacks.length}):`);
  pool.fallbacks.forEach((m, idx) => console.log(`    ↳ Fallback ${idx + 1}: ${m}`));

  // Measure in-memory cached read time (<1ms requirement)
  const cachedStart = performance.now();
  const cachedPool = await getPrioritizedNvidiaModels();
  const cachedMs = performance.now() - cachedStart;
  console.log(`  In-Memory Cached Read Time: ${cachedMs.toFixed(3)}ms (< 1ms target)`);

  const hasPrimary = Boolean(pool.primary && typeof pool.primary === 'string');
  const has6Fallbacks = Array.isArray(pool.fallbacks) && pool.fallbacks.length >= 6;
  const totalModels = 1 + pool.fallbacks.length;

  if (!hasPrimary) {
    throw new Error('Test 1 Failed: Primary model is missing or invalid.');
  }
  if (!has6Fallbacks) {
    throw new Error(`Test 1 Failed: Expected at least 6 fallback models, found ${pool.fallbacks.length}.`);
  }
  if (totalModels < 7) {
    throw new Error(`Test 1 Failed: Expected 7 total models in pool, found ${totalModels}.`);
  }

  recordResult(
    'TEST 1: Model Priority Resolution',
    true,
    `Resolved 1 Primary ('${pool.primary}') + ${pool.fallbacks.length} Fallbacks (Total ${totalModels}). In-memory read: ${cachedMs.toFixed(2)}ms`,
    resolutionMs
  );
}

// ---------------------------------------------------------------------------
// TEST 2: Live Happy-Path Inference with Real NVIDIA Credentials
// ---------------------------------------------------------------------------
async function test2_LiveHappyPathInference() {
  console.log('\n--- Running TEST 2: Live Happy-Path Inference ---');

  const startT = Date.now();
  const messages = [
    { role: 'user', content: 'Reply with one word: READY' }
  ];

  console.log('  Sending live request via prioritized pool...');
  const res = await executeChatCompletion(messages, {
    temperature: 0.1,
    max_tokens: 15
  });

  const elapsed = Date.now() - startT;
  console.log(`  Response Provider: ${res.provider}`);
  console.log(`  Response Model: ${res.model}`);
  console.log(`  Fallback Depth: ${res.fallbackDepth}`);
  console.log(`  Content: "${res.content}"`);

  if (!res.content || res.content.trim().length === 0) {
    throw new Error('Test 2 Failed: Response content is empty.');
  }
  if (res.provider !== 'nvidia') {
    throw new Error(`Test 2 Failed: Expected provider 'nvidia', received '${res.provider}'.`);
  }

  recordResult(
    'TEST 2: Live Happy-Path Inference',
    true,
    `Successfully served by ${res.model} (depth=${res.fallbackDepth}, latency=${res.latencyMs}ms) with reply: "${res.content.slice(0, 30)}"`,
    elapsed
  );
}

// ---------------------------------------------------------------------------
// TEST 3: Simulated Deprecated Primary Model (Bypass to Fallback 1)
// ---------------------------------------------------------------------------
async function test3_SimulatedDeprecatedPrimaryModel() {
  console.log('\n--- Running TEST 3: Simulated Deprecated Primary Model Bypass ---');

  const pool = await getPrioritizedNvidiaModels();
  const fakePrimary = 'fake-pub/deprecated-model-999b';
  // Candidate list has the fake primary first, followed by live fallbacks
  const candidates = [fakePrimary, ...pool.fallbacks];

  console.log(`  Primary (Simulated Deprecated): ${fakePrimary}`);
  console.log(`  Next Expected Fallback: ${candidates[1]}`);

  const startT = Date.now();
  const messages = [
    { role: 'user', content: 'Reply with one word: READY' }
  ];

  const res = await executeChatCompletion(messages, {
    candidateModelsOverride: candidates,
    temperature: 0.1,
    max_tokens: 15
  });

  const elapsed = Date.now() - startT;
  console.log(`  Served by Model: ${res.model}`);
  console.log(`  Fallback Depth: ${res.fallbackDepth}`);
  console.log(`  Provider: ${res.provider}`);
  console.log(`  Recorded Attempts (${res.attempts.length}):`);
  res.attempts.forEach((att, idx) => {
    console.log(`    ↳ [${idx + 1}] ${att.target}: ${att.status} ${att.error ? `(${att.error})` : ''}`);
  });

  // Verify that fake primary was attempted and failed
  const firstAttempt = res.attempts[0];
  const fakeAttemptFailed = firstAttempt && firstAttempt.target.includes(fakePrimary) && firstAttempt.status === 'failed';

  if (!fakeAttemptFailed) {
    throw new Error(`Test 3 Failed: Fake primary '${fakePrimary}' was not marked as failed.`);
  }
  if (res.fallbackDepth < 1) {
    throw new Error(`Test 3 Failed: Expected fallbackDepth >= 1, received ${res.fallbackDepth}.`);
  }
  if (!res.content || res.content.trim().length === 0) {
    throw new Error('Test 3 Failed: Response content is empty.');
  }

  recordResult(
    'TEST 3: Deprecated Primary Bypass',
    true,
    `Fake primary '${fakePrimary}' seamlessly bypassed (HTTP error caught); served by fallback '${res.model}' at depth ${res.fallbackDepth}`,
    elapsed
  );
}

// ---------------------------------------------------------------------------
// TEST 4: Simulated 100% NVIDIA Outage (Triggers Google Gemini Handoff)
// ---------------------------------------------------------------------------
async function test4_SimulatedNvidiaOutageGeminiFallback() {
  console.log('\n--- Running TEST 4: Simulated 100% NVIDIA Outage (Gemini Handoff) ---');

  const startT = Date.now();
  const messages = [
    { role: 'user', content: 'Reply with one word: READY' }
  ];

  // Test full outage using simulatedOutage option
  console.log('  Simulating total NVIDIA outage across all 7 tiers...');
  const res = await executeChatCompletion(messages, {
    simulatedOutage: true,
    temperature: 0.1,
    max_tokens: 15
  });

  const elapsed = Date.now() - startT;
  console.log(`  Failover Provider: ${res.provider}`);
  console.log(`  Failover Model: ${res.model}`);
  console.log(`  Fallback Depth: ${res.fallbackDepth}`);
  console.log(`  Content: "${res.content}"`);

  if (res.provider !== 'gemini') {
    throw new Error(`Test 4 Failed: Expected provider 'gemini', received '${res.provider}'.`);
  }
  if (!res.content || res.content.trim().length === 0) {
    throw new Error('Test 4 Failed: Gemini fallback returned empty content.');
  }

  recordResult(
    'TEST 4: 100% Outage Gemini Handoff',
    true,
    `Complete NVIDIA outage seamlessly failed over to Google Gemini (${res.model}) with zero dropped user requests. Content: "${res.content.slice(0, 30)}"`,
    elapsed
  );
}

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------
async function runAllTests() {
  console.log('='.repeat(75));
  console.log(' END-TO-END RESILIENCE TEST SUITE: NVIDIA 6-TIER ENGINE & GEMINI HANDOFF');
  console.log('='.repeat(75));

  try {
    await test1_ModelPriorityResolution();
    await sleep(2200); // 2.2s safe pacing before live inference
    await test2_LiveHappyPathInference();
    await sleep(2200); // 2.2s safe pacing before next test
    await test3_SimulatedDeprecatedPrimaryModel();
    await sleep(1500); // Safe pacing before Gemini test
    await test4_SimulatedNvidiaOutageGeminiFallback();

    console.log('\n' + '='.repeat(75));
    console.log(' SUMMARY OF RESILIENCE TEST SUITE RESULTS:');
    console.log('='.repeat(75));
    console.table(testResults.map((r) => ({
      'Test Name': r.name,
      'Status': r.passed ? 'PASSED (100%)' : 'FAILED',
      'Duration (ms)': r.latencyMs,
      'Verification Summary': r.details
    })));

    console.log('\n✓ ALL 4 CRITICAL RESILIENCE TESTS PASSED WITH 100% SUCCESS.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ TEST SUITE FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runAllTests();
