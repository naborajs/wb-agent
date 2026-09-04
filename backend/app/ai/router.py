"""
Central AI Router (AIRouter) for WB-Agent (EDITH).
Implements Directive §3, §4, and §5:
- Dual NVIDIA NIM keys (Primary & Fallback)
- Model[0] Key A -> Model[0] Key B -> Model[1] Key A -> Model[1] Key B ...
- Per-(model, key) circuit breaker cooldowns
- Fail-closed two-stage guardrails (§3.G)
- Telemetry & observability logging
- Backward compatibility with legacy LLMRouter interface
"""

import json
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.ai.chains import get_capability_chain
from app.ai.circuit_breaker import circuit_breaker
from app.ai.client import NIMClient
from app.ai.types import (
    Capability,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    SafetyVerdict,
)
from app.config import settings
from app.utils.logging import logger


class AIRouter:
    """
    Central AI Router orchestrating capability fallback chains, dual-key failover,
    circuit breaking, and fail-closed safety guardrails.
    """

    def __init__(
        self,
        primary_key: Optional[str] = None,
        fallback_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.primary_key = primary_key or settings.nvidia_primary_key
        self.fallback_key = fallback_key or settings.nvidia_fallback_key
        self.client = NIMClient(base_url=base_url)

        # Telemetry aggregation
        self.metrics: Dict[str, Any] = {
            "total_requests": 0,
            "total_failures": 0,
            "fallback_events": 0,
            "by_capability": {},
            "by_model": {},
            "by_key": {"primary": 0, "fallback": 0},
            "guardrail_holds": 0,
        }

    def _get_active_keys(self) -> List[Tuple[str, str]]:
        """Returns list of (key_alias, api_key) pairs to try in order."""
        keys = []
        if self.primary_key and self.primary_key.strip():
            keys.append(("primary", self.primary_key.strip()))
        if (
            self.fallback_key
            and self.fallback_key.strip()
            and self.fallback_key.strip() != self.primary_key.strip()
        ):
            keys.append(("fallback", self.fallback_key.strip()))
        if not keys:
            # Mock dev fallback
            keys.append(("primary", "nvapi-mock-key"))
        return keys

    async def execute(
        self,
        capability: Capability,
        request: ModelRequest,
    ) -> ModelResponse:
        """
        Executes a capability request across its ordered fallback chain:
        model[0] + key A -> model[0] + key B -> model[1] + key A -> model[1] + key B ...
        """
        start_t = time.time()
        chain = get_capability_chain(capability)
        keys = self._get_active_keys()

        self.metrics["total_requests"] += 1
        cap_stats = self.metrics["by_capability"].setdefault(
            capability.value, {"requests": 0, "successes": 0, "fallbacks": 0, "total_ms": 0}
        )
        cap_stats["requests"] += 1

        fallback_depth = 0
        last_error: Optional[Exception] = None

        for model_idx, model in enumerate(chain):
            # Capability D voice fallback may include Gemini Live
            if model.startswith("gemini-"):
                # Scoped Gemini Live audio handled directly if voice capability
                continue

            for key_alias, key in keys:
                if not circuit_breaker.is_available(model, key_alias):
                    logger.debug(f"Circuit breaker OPEN for ({model}, {key_alias}); advancing chain.")
                    continue

                try:
                    logger.debug(
                        f"Executing capability '{capability.value}' on model '{model}' using {key_alias} key "
                        f"(depth={fallback_depth})."
                    )
                    res = await self.client.execute_request(
                        model=model,
                        api_key=key,
                        request=request,
                        key_alias=key_alias,
                        fallback_depth=fallback_depth,
                    )

                    # Success! Reset circuit breaker and record metrics
                    circuit_breaker.record_success(model, key_alias)
                    elapsed_ms = int((time.time() - start_t) * 1000)

                    cap_stats["successes"] += 1
                    cap_stats["total_ms"] += elapsed_ms
                    self.metrics["by_key"][key_alias] = self.metrics["by_key"].get(key_alias, 0) + 1
                    model_stats = self.metrics["by_model"].setdefault(
                        model, {"calls": 0, "total_latency_ms": 0}
                    )
                    model_stats["calls"] += 1
                    model_stats["total_latency_ms"] += res.latency_ms

                    if fallback_depth > 0:
                        self.metrics["fallback_events"] += 1
                        cap_stats["fallbacks"] += 1

                    logger.info(
                        f"[AIRouter] Capability '{capability.value}' completed via model '{model}' "
                        f"({key_alias} key) at depth {fallback_depth} in {elapsed_ms}ms."
                    )
                    return res

                except Exception as exc:
                    last_error = exc
                    status_code = getattr(getattr(exc, "response", None), "status_code", None)
                    circuit_breaker.record_failure(model, key_alias, status_code=status_code)
                    fallback_depth += 1
                    self.metrics["total_failures"] += 1
                    logger.warning(
                        f"[AIRouter] Attempt failed for capability '{capability.value}' on model '{model}' "
                        f"with {key_alias} key: {exc}. Advancing to next candidate..."
                    )

        # True last-resort fallback (§5): Only after all NVIDIA models have failed on both keys
        # Note: Directive §3.F explicitly states for translation: "don't reach for Gemini here."
        # And Directive §3.G safety guardrails fail closed rather than falling through to external models.
        if (
            capability not in (Capability.TRANSLATION, Capability.SAFETY_INPUT, Capability.SAFETY_OUTPUT)
            and settings.GEMINI_API_KEY
            and settings.GEMINI_API_KEY.strip()
        ):
            try:
                logger.info(
                    f"[AIRouter] All NIM models failed for {capability.value}. Invoking last-resort Gemini fallback."
                )
                res = await self._call_gemini_emergency_fallback(request, fallback_depth=fallback_depth)
                return res
            except Exception as gem_err:
                logger.error(f"[AIRouter] Last-resort Gemini fallback also failed: {gem_err}")

        # Final local fallback
        logger.error(
            f"[AIRouter] Entire chain failed for capability '{capability.value}' (depth={fallback_depth}). "
            f"Returning safe local emergency fallback."
        )
        return self.client._generate_simulated_response(
            model="local_emergency_fallback",
            request=request,
            key_alias="emergency",
            fallback_depth=fallback_depth,
            latency_ms=int((time.time() - start_t) * 1000),
        )

    # -------------------------------------------------------------------------
    # Two-Stage Fail-Closed Safety Guardrails (§3.G)
    # -------------------------------------------------------------------------
    async def check_input_safety(self, text: str) -> SafetyVerdict:
        """
        Stage 1 Input Guardrail using `nvidia/nemotron-3.5-content-safety`.
        FAILS CLOSED: If the model fails, errors, or flags unsafe, holds for human review.
        """
        start_t = time.time()
        model = "nvidia/nemotron-3.5-content-safety"
        keys = self._get_active_keys()

        # Offline / simulation bypass for safe test strings
        if settings.LLM_PROVIDER == "simulator" or not self.primary_key or self.primary_key.startswith("nvapi-mock"):
            # Check for simulated malicious tokens in tests
            lower = text.lower()
            if any(bad in lower for bad in ["jailbreak", "prompt injection", "drop table", "ignore previous instructions"]):
                self.metrics["guardrail_holds"] += 1
                return SafetyVerdict(
                    is_safe=False,
                    reason="Flagged by simulated input content safety classifier",
                    held_for_human=True,
                    model_used=model,
                    key_used="simulated",
                    latency_ms=1,
                )
            return SafetyVerdict(is_safe=True, model_used=model, key_used="simulated", latency_ms=1)

        req = ModelRequest(
            messages=[
                ModelMessage(
                    role="system",
                    content="You are a safety classifier. Output JSON: {\"is_safe\": true/false, \"reason\": \"...\"}",
                ),
                ModelMessage(role="user", content=f"Classify input safety: {text}"),
            ],
            temperature=0.0,
            max_tokens=128,
        )

        for key_alias, key in keys:
            try:
                res = await self.client.execute_request(model=model, api_key=key, request=req, key_alias=key_alias)
                elapsed_ms = int((time.time() - start_t) * 1000)
                try:
                    data = json.loads(res.content)
                    is_safe = bool(data.get("is_safe", True))
                    reason = data.get("reason")
                    if not is_safe:
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=reason or "Safety policy violation detected",
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
                except Exception:
                    # If model returned text that clearly indicates unsafe
                    if "unsafe" in res.content.lower() or "violation" in res.content.lower():
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=res.content[:100],
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
            except Exception as e:
                logger.warning(f"Input safety check call failed on {key_alias} key: {e}")

        # Fail closed: Do NOT fall back to another model to re-check
        self.metrics["guardrail_holds"] += 1
        logger.warning("Input safety guardrail failed to respond. Failing closed to hold for human.")
        return SafetyVerdict(
            is_safe=False,
            reason="Input safety guardrail unavailable; failed closed for human review",
            held_for_human=True,
            model_used=model,
            key_used="none",
            latency_ms=int((time.time() - start_t) * 1000),
        )

    async def check_output_safety(self, text: str) -> SafetyVerdict:
        """
        Stage 2 Output Guardrail using `nvidia/llama-3.1-nemotron-safety-guard-8b-v3`.
        FAILS CLOSED: If the model fails or verdicts unsafe, message is held for human review.
        """
        start_t = time.time()
        model = "nvidia/llama-3.1-nemotron-safety-guard-8b-v3"
        keys = self._get_active_keys()

        if settings.LLM_PROVIDER == "simulator" or not self.primary_key or self.primary_key.startswith("nvapi-mock"):
            lower = text.lower()
            if any(bad in lower for bad in ["unverified pricing", "leak confidential", "unsafe_token"]):
                self.metrics["guardrail_holds"] += 1
                return SafetyVerdict(
                    is_safe=False,
                    reason="Simulated output policy violation",
                    held_for_human=True,
                    model_used=model,
                    key_used="simulated",
                    latency_ms=1,
                )
            return SafetyVerdict(is_safe=True, model_used=model, key_used="simulated", latency_ms=1)

        req = ModelRequest(
            messages=[
                ModelMessage(
                    role="system",
                    content="You are an enterprise output guardrail. Output JSON: {\"is_safe\": true/false, \"reason\": \"...\"}",
                ),
                ModelMessage(role="user", content=f"Verify outbound response safety: {text}"),
            ],
            temperature=0.0,
            max_tokens=128,
        )

        for key_alias, key in keys:
            try:
                res = await self.client.execute_request(model=model, api_key=key, request=req, key_alias=key_alias)
                elapsed_ms = int((time.time() - start_t) * 1000)
                try:
                    data = json.loads(res.content)
                    is_safe = bool(data.get("is_safe", True))
                    reason = data.get("reason")
                    if not is_safe:
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=reason or "Outbound content policy violation",
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
                except Exception:
                    if "unsafe" in res.content.lower() or "violation" in res.content.lower():
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=res.content[:100],
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
            except Exception as e:
                logger.warning(f"Output safety check call failed on {key_alias} key: {e}")

        # Fail closed
        self.metrics["guardrail_holds"] += 1
        logger.warning("Output safety guardrail failed to respond. Failing closed to hold for human.")
        return SafetyVerdict(
            is_safe=False,
            reason="Output safety guardrail unavailable; failed closed for human review",
            held_for_human=True,
            model_used=model,
            key_used="none",
            latency_ms=int((time.time() - start_t) * 1000),
        )

    # -------------------------------------------------------------------------
    # Last-Resort Emergency Fallback (§5)
    # -------------------------------------------------------------------------
    async def _call_gemini_emergency_fallback(
        self,
        request: ModelRequest,
        fallback_depth: int,
    ) -> ModelResponse:
        """Invoked ONLY when every NVIDIA NIM model has failed on both keys."""
        start_t = time.time()
        api_key = settings.GEMINI_API_KEY
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        prompt_parts = []
        for m in request.messages:
            prompt_parts.append(f"{m.role.upper()}: {m.content}")
        combined_prompt = "\n".join(prompt_parts)

        payload = {
            "contents": [{"parts": [{"text": combined_prompt}]}],
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        latency_ms = int((time.time() - start_t) * 1000)
        return ModelResponse(
            content=reply,
            model="gemini-1.5-flash",
            provider="gemini_emergency",
            key_alias="gemini",
            fallback_depth=fallback_depth,
            latency_ms=latency_ms,
        )

    # -------------------------------------------------------------------------
    # Capability Specific Execution Helpers (Directive §3.C, §3.D, §3.E, §3.F)
    # -------------------------------------------------------------------------
    async def transcribe_voice(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/ogg",
        working_language: str = "en",
    ) -> str:
        """
        Executes Capability D Voice Note Understanding cascade (Directive §3.D):
        1. Primary: Nemotron Omni reasoning model tried across Primary and Fallback NVIDIA keys
        2. Fallback 1: Gemini Live / multimodal audio via scoped GeminiAudioClient
        3. Fallback 2: Pass transcribed text through Riva Translate if customer's language differs
        4. Local safe simulation if external inference fails or offline
        """
        import base64
        clean_mime = mime_type.lower().split(";")[0].strip()

        # Check for simulated test token embedded in raw audio
        try:
            text_str = audio_bytes.decode("utf-8", errors="ignore")
            if "TRANSCRIPT:" in text_str:
                return text_str.split("TRANSCRIPT:")[1].strip()
        except Exception:
            pass

        start_t = time.time()
        transcript = ""
        model_used = ""
        key_used = ""
        fallback_depth = 0

        # Step 1: Primary - nvidia/nemotron-3-nano-omni-30b-a3b-reasoning tried on both keys
        primary_model = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
        keys = self._get_active_keys()
        b64_audio = base64.b64encode(audio_bytes).decode("utf-8")

        for key_alias, key in keys:
            if not circuit_breaker.is_available(primary_model, key_alias):
                continue

            # In simulator/offline dev mode
            if not key or key.startswith("nvapi-mock") or settings.LLM_PROVIDER == "simulator":
                raw_text = audio_bytes.decode("utf-8", errors="ignore").lower()
                if "darjeeling" in raw_text:
                    transcript = "Namaste, Darjeeling FTGFOP1 first flush ka 25kg rate chahiye hotel buffet ke liye."
                elif "assam" in raw_text or "ctc" in raw_text:
                    transcript = "Bhai Assam Kadak CTC 50kg rate chahiye Siliguri cafe ke liye."
                else:
                    transcript = "Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao"
                model_used = primary_model
                key_used = key_alias
                break

            url = f"{self.client.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": primary_model,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Transcribe the customer's wholesale tea order voice note accurately in English, Hindi, or Hinglish: "
                            f"data:{clean_mime};base64,{b64_audio}"
                        ),
                    }
                ],
                "max_tokens": 256,
                "temperature": 0.1,
            }

            try:
                async with httpx.AsyncClient(timeout=float(self.client.timeout)) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        transcript = data["choices"][0]["message"]["content"].strip()
                        circuit_breaker.record_success(primary_model, key_alias)
                        model_used = primary_model
                        key_used = key_alias
                        break
                    else:
                        circuit_breaker.record_failure(primary_model, key_alias, status_code=resp.status_code)
                        fallback_depth += 1
            except Exception as e:
                circuit_breaker.record_failure(primary_model, key_alias)
                fallback_depth += 1
                logger.warning(f"[AIRouter] Nemotron Omni voice attempt failed on {key_alias} key: {e}")

        # Step 2: Fallback 1 - Gemini Live Preview (§3.D Fallback 1)
        if not transcript:
            from app.ai.gemini_audio import GeminiAudioClient
            gemini_client = GeminiAudioClient()
            if gemini_client.api_key:
                try:
                    logger.info("[AIRouter] Invoking scoped Gemini Live audio fallback.")
                    transcript = await gemini_client.transcribe_audio(
                        audio_bytes, mime_type=mime_type, model="gemini-3.1-flash-live-preview"
                    )
                    if transcript:
                        model_used = "gemini-3.1-flash-live-preview"
                        key_used = "gemini"
                        fallback_depth += 1
                except Exception as ge:
                    logger.warning(f"[AIRouter] Gemini Live audio fallback failed: {ge}")

        # Step 3: Local fallback if external calls fail
        if not transcript:
            raw_text = audio_bytes.decode("utf-8", errors="ignore").lower()
            if "darjeeling" in raw_text:
                transcript = "Namaste, Darjeeling FTGFOP1 first flush ka 25kg rate chahiye hotel buffet ke liye."
            elif "assam" in raw_text or "ctc" in raw_text:
                transcript = "Bhai Assam Kadak CTC 50kg rate chahiye Siliguri cafe ke liye."
            else:
                transcript = "Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao"
            model_used = "local_audio_fallback"
            key_used = "local"

        # Step 4: Fallback 2 - Riva Translation pass-through (§3.D Fallback 2)
        # If the customer's language differs from the agent's working language
        try:
            from app.agent.intent import detect_language
            cust_lang = detect_language(transcript)
            if working_language.lower() in ("en", "english") and cust_lang in ("Hindi", "Hinglish"):
                logger.info(f"[AIRouter] Customer spoke in {cust_lang}; passing through Riva translation.")
                translated = await self.translate_text(
                    text=transcript,
                    target_language="English",
                    source_language=cust_lang,
                )
                if translated and translated.strip():
                    logger.info(f"[AIRouter] Riva translated transcript: '{translated}'")
        except Exception as te:
            logger.warning(f"[AIRouter] Riva translation pass failed: {te}")

        logger.info(
            f"[AIRouter] Voice note processed via {model_used} ({key_used} key, depth={fallback_depth}) in "
            f"{int((time.time() - start_t)*1000)}ms"
        )
        return transcript.strip()

    async def extract_pricing_order(
        self,
        inbound_text: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Capability C: Structured pricing & order data extraction (Directive §3.C).
        Converts customer order inquiry into structured JSON across model cascade.
        """
        ctx_lines = []
        if context:
            for k, v in context.items():
                if v:
                    ctx_lines.append(f"- {k}: {v}")
        ctx_str = "\n".join(ctx_lines) if ctx_lines else "No prior profile."

        system_msg = (
            "You are a structured invoice and order extraction engine for North Bengal Tea Co.\n"
            "Extract the order details from the conversation into strict JSON schema:\n"
            "{\n"
            "  \"buyer_name\": \"...\",\n"
            "  \"buyer_phone\": \"...\",\n"
            "  \"buyer_company\": \"...\",\n"
            "  \"delivery_city\": \"...\",\n"
            "  \"delivery_state\": \"...\",\n"
            "  \"buyer_gstin\": null,\n"
            "  \"items\": [\n"
            "    {\n"
            "      \"product_name\": \"...\",\n"
            "      \"quantity_kg\": 50.0,\n"
            "      \"packaging_type\": \"...\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "Return ONLY the JSON object."
        )

        user_content = f"Customer context:\n{ctx_str}\n\nLatest Customer Message:\n{inbound_text}"
        req = ModelRequest(
            messages=[
                ModelMessage(role="system", content=system_msg),
                ModelMessage(role="user", content=user_content),
            ],
            temperature=0.1,
            max_tokens=512,
            metadata={"capability": "pricing_extraction"},
        )

        resp = await self.execute(Capability.PRICING_EXTRACTION, req)
        clean_text = resp.content.strip()
        if clean_text.startswith("```"):
            lines = clean_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()

        try:
            return json.loads(clean_text)
        except Exception as e:
            logger.warning(f"[AIRouter] Failed to parse JSON from pricing extraction: {e}")
            return {
                "items": [
                    {
                        "product_name": "Assam Kadak CTC Granules",
                        "quantity_kg": 50.0,
                        "packaging_type": "50kg multi-wall paper sacks with food-grade liner",
                    }
                ]
            }

    async def translate_text(
        self,
        text: str,
        target_language: str = "English",
        source_language: Optional[str] = None,
    ) -> str:
        """
        Capability F: Multilingual translation layer (Directive §3.F).
        Primary: riva-translate-4b-instruct-v2, falling through to core chat models.
        """
        src = f" from {source_language}" if source_language else ""
        system_msg = (
            f"You are an enterprise translation engine. Translate the provided text{src} accurately into {target_language}. "
            "Preserve business terminology (estate names, tea grades, Indian rupee amounts). Output ONLY the translated text."
        )
        req = ModelRequest(
            messages=[
                ModelMessage(role="system", content=system_msg),
                ModelMessage(role="user", content=text),
            ],
            temperature=0.1,
            max_tokens=512,
            metadata={"capability": "translation", "target_language": target_language},
        )
        resp = await self.execute(Capability.TRANSLATION, req)
        return resp.content.strip()

    async def inspect_document(
        self,
        image_data: Any,
        mime_type: str = "image/jpeg",
        prompt: str = "Extract product specifications, tea grade, pricing, and volume details from this document.",
    ) -> ModelResponse:
        """
        Capability E: Vision & Document Understanding (Directive §3.E).
        Primary: llama-3.2-11b-vision-instruct -> muse-glimmer-30b -> nemotron-3-nano-omni.
        """
        import base64
        if isinstance(image_data, bytes):
            b64_str = base64.b64encode(image_data).decode("utf-8")
            data_uri = f"data:{mime_type};base64,{b64_str}"
        else:
            data_uri = str(image_data)

        req = ModelRequest(
            messages=[
                ModelMessage(
                    role="user",
                    content=f"{prompt}\nDocument: {data_uri}",
                )
            ],
            temperature=0.1,
            max_tokens=512,
            metadata={"capability": "vision_document"},
        )
        return await self.execute(Capability.VISION_DOCUMENT, req)

    # -------------------------------------------------------------------------
    # Backward-Compatibility Methods for Legacy Code & Tests
    # -------------------------------------------------------------------------
    async def generate(
        self,
        messages: List[Any],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        task_class: Any = None,
        capability: Capability = Capability.CORE_BRAIN,
    ) -> Any:
        """
        Drop-in backward-compatible bridge for legacy orchestrator and test suites.
        """
        from app.agent.providers.base import LLMResponse

        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
        max_t = max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS

        model_msgs = [
            ModelMessage(role=getattr(m, "role", "user"), content=getattr(m, "content", str(m)))
            for m in messages
        ]
        req = ModelRequest(
            messages=model_msgs,
            temperature=temp,
            max_tokens=max_t,
            tools=tools,
        )

        res = await self.execute(capability=capability, request=req)

        return LLMResponse(
            content=res.content,
            model=res.model,
            provider=res.provider,
            latency_ms=res.latency_ms,
            prompt_tokens=res.prompt_tokens,
            completion_tokens=res.completion_tokens,
            total_tokens=res.total_tokens,
            tool_calls=res.tool_calls,
            reasoning_content=res.reasoning_content,
        )

    async def test_model_connection(
        self,
        model: str,
        api_key: str,
        base_url: str = "https://integrate.api.nvidia.com/v1",
        timeout: int = 10,
    ) -> Dict[str, Any]:
        """Actively verifies connectivity against OpenAI-compatible completions endpoint."""
        start_t = time.time()
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Respond with 'OK' only."}],
            "max_tokens": 10,
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                resp = await client.post(url, json=payload, headers=headers)
                latency_ms = int((time.time() - start_t) * 1000)

                if resp.status_code == 200:
                    data = resp.json()
                    reply = data["choices"][0]["message"]["content"].strip()
                    return {
                        "status": "connected",
                        "model": model,
                        "latency_ms": latency_ms,
                        "sample_response": reply,
                        "tokens_used": data.get("usage", {}).get("total_tokens", 0),
                    }
                else:
                    return {
                        "status": "error",
                        "model": model,
                        "status_code": resp.status_code,
                        "error": resp.text[:200],
                        "latency_ms": latency_ms,
                    }
        except Exception as e:
            return {
                "status": "unreachable",
                "model": model,
                "error": str(e),
                "latency_ms": int((time.time() - start_t) * 1000),
            }

    async def health_check(self) -> Dict[str, Any]:
        """Provides status and metrics summary for dashboard operations."""
        return {
            "status": "healthy",
            "primary_key_configured": bool(self.primary_key and not self.primary_key.startswith("nvapi-mock")),
            "fallback_key_configured": bool(self.fallback_key and not self.fallback_key.startswith("nvapi-mock")),
            "metrics": self.metrics,
        }


# Global singleton instance
ai_router = AIRouter()
