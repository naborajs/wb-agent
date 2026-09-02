"""
Agent Tools Registry and Execution Engine (Section 70 & 71).

Guarantees:
- Strongly typed execution.
- Read authority for catalog, pricing, and knowledge.
- Safe write authority for customer memory, handoffs, and follow-ups.
- Absolute rejection of unauthorized administrative mutations.
- Full audit logging of all tool invocations in PostgreSQL.
"""

from decimal import Decimal
import time
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import ToolCall
from app.knowledge.retrieval import KnowledgeRetrievalService
from app.memory.customer import CustomerMemoryService
from app.pricing.calculator import PricingService
from app.products.service import ProductService
from app.utils.logging import logger


class ToolRegistry:
    """
    Executes verified tools on behalf of the AI Agent with strict security boundaries.
    """

    def __init__(self, session: AsyncSession, org_id: str, agent_run_id: str):
        self.session = session
        self.org_id = org_id
        self.agent_run_id = agent_run_id
        self.product_svc = ProductService(session, org_id)
        self.pricing_svc = PricingService(session, org_id)
        self.knowledge_svc = KnowledgeRetrievalService(session, org_id)
        self.memory_svc = CustomerMemoryService(session, org_id)

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a named tool, enforcing permission checks and recording audit metrics.
        """
        start_t = time.time()
        is_error = False
        error_msg: Optional[str] = None
        result: Dict[str, Any] = {}

        try:
            # Enforce read/write authority boundaries (Section 71)
            forbidden_tools = {
                "update_global_pricing",
                "create_api_key",
                "delete_customer",
                "override_margin",
                "approve_unauthorized_discount",
            }
            if tool_name in forbidden_tools:
                raise PermissionError(f"Tool '{tool_name}' is restricted to human administrators only.")

            if tool_name == "search_products":
                category = arguments.get("category")
                query = arguments.get("query")
                products = await self.product_svc.search_products(query=query, category=category)
                result = {
                    "count": len(products),
                    "products": [
                        {
                            "id": p.id,
                            "sku": p.sku,
                            "name": p.name,
                            "category": p.category,
                            "tea_grade": p.tea_grade,
                            "min_order_quantity_kg": float(p.min_order_quantity_kg),
                            "in_stock": p.in_stock,
                        }
                        for p in products[:5]
                    ],
                }

            elif tool_name == "calculate_price":
                product_id = arguments["product_id"]
                quantity_kg = Decimal(str(arguments["quantity_kg"]))
                customer_segment = arguments.get("customer_segment")
                requested_discount = Decimal(str(arguments.get("requested_discount", "0.0")))

                quote = await self.pricing_svc.calculate_price(
                    product_id=product_id,
                    quantity_kg=quantity_kg,
                    customer_segment=customer_segment,
                    requested_discount=requested_discount,
                )
                result = {
                    "product_name": quote.product_name,
                    "quantity_kg": float(quote.quantity_kg),
                    "base_price_per_kg": float(quote.base_price_per_kg),
                    "discount_percentage": float(quote.discount_percentage),
                    "effective_price_per_kg": float(quote.effective_price_per_kg),
                    "subtotal": float(quote.subtotal),
                    "discount_amount": float(quote.discount_amount),
                    "total": float(quote.total),
                    "currency": quote.currency,
                    "applied_rules": quote.applied_rules,
                    "requires_human_approval": quote.requires_human_approval,
                    "approval_reason": quote.approval_reason,
                }

            elif tool_name == "search_knowledge":
                query = arguments["query"]
                results = await self.knowledge_svc.search(query=query, top_k=3)
                result = {
                    "matches": [
                        {
                            "document": r.document_title,
                            "section": r.section_heading,
                            "content": r.content,
                            "score": r.similarity_score,
                        }
                        for r in results
                    ]
                }

            elif tool_name == "save_customer_memory":
                customer_id = arguments["customer_id"]
                category = arguments["category"]
                key = arguments["key"]
                value = arguments["value"]
                mem = await self.memory_svc.save_fact(
                    customer_id=customer_id,
                    category=category,
                    key=key,
                    value=value,
                    confidence=float(arguments.get("confidence", 1.0)),
                    verification_status=arguments.get("verification_status", "CUSTOMER_SAID"),
                )
                result = {"saved": True, "key": mem.key, "status": mem.verification_status}

            else:
                raise ValueError(f"Unknown tool: '{tool_name}'")

        except Exception as e:
            is_error = True
            error_msg = str(e)
            result = {"error": error_msg}
            logger.error(f"Tool execution failed for '{tool_name}': {e}")

        latency_ms = int((time.time() - start_t) * 1000)

        # Log ToolCall audit record
        tool_call_record = ToolCall(
            org_id=self.org_id,
            agent_run_id=self.agent_run_id,
            tool_name=tool_name,
            arguments=arguments,
            result=result,
            is_error=is_error,
            error_message=error_msg,
            latency_ms=latency_ms,
        )
        self.session.add(tool_call_record)
        await self.session.commit()

        return result
