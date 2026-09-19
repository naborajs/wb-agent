# ADR 0023: Conversation History Lifecycle, Deletion Controls, and Database Management

## Status
Accepted

## Date
2026-09-19

## Context
As real WhatsApp inquiries, test simulations, and multi-turn sales dialogues accumulate in the SQLite / PostgreSQL database, operational challenges arise:
1. **History Visibility & Retrieval**: Operators need immediate, transparent access to all conversational threads, including personal owner test numbers (e.g., `+918900653250` with extensive multi-turn history) and commercial buyer leads, without threads being inadvertently hidden by default filters.
2. **Storage Management & Data Pruning**: Previously, the platform lacked an endpoint or dashboard mechanism to delete conversations or purge simulation test data. Over time, accumulated test runs consume storage and clutter operator views.
3. **Dual-Brain Agency & Commercial Safety**: AI assistants (FRIDAY and EDITH) must have meta-cognitive ability to inspect database statistics and execute pruning actions on command, while preserving independent commercial judgment. Specifically, if an operator instructs an AI to delete a qualified hot lead with an active negotiation or pending pro-forma invoice, EDITH must have autonomous refusal authority to warn the operator and require manual dashboard confirmation to prevent accidental loss of revenue.

---

## Decisions

### 1. Programmatic Conversation Deletion (`delete_conversation`)
Implemented in `backend/app/conversations/service.py` and exposed via `DELETE /api/v1/conversations/{conversation_id}`:
- Permanently deletes the conversation and enforces relational cascading across all tables (`messages`, `sales_events`, `handoffs`, `conversation_summaries`).
- Bypasses warnings by cleanly handling relationship-level cascades and unlinked event records.

### 2. Bulk Simulation History Purging (`purge_simulations`)
Implemented in `ConversationService.purge_simulations` and exposed via `POST /api/v1/conversations/simulations/purge`:
- Identifies all conversations tagged with `channel="simulation"` or dummy sandbox numbers (`+919876543210`, `+919999988888`, etc.).
- Deletes associated test messages and conversation records in a single atomic transaction.
- Strictly preserves all authentic customer records, live WhatsApp threads, and product catalog documents.

### 3. Comprehensive Database Telemetry (`get_database_summary`)
Implemented in `ConversationService.get_database_summary` and exposed via `GET /api/v1/conversations/database/stats`:
- Returns live counts of total conversations, total stored messages, live WhatsApp threads, and simulated threads.

### 4. Operator Dashboard UI Controls
Updated `dashboard/app/conversations/page.tsx`:
- **"All Threads" Filter Tab**: Added alongside **WhatsApp Live** and **🧪 Simulated** tabs, giving operators immediate visibility across all stored contacts and personal test threads.
- **Delete Conversation Action**: Added red **Delete** button in the chat header with a confirmation modal, allowing one-click permanent removal of selected threads.
- **Purge All Simulations Toolbar**: In the **🧪 Simulated** view, operators can purge all test data with a single button.
- **Reset Chat**: Retained to clear message history and reset customer state while keeping contact metadata.

### 5. FRIDAY & EDITH Autonomous Integration (`inter_brain_bus.py`)
- **Database Inspection**: Operators can ask Friday (*"Check the full database stats"*, *"How many messages do we have?"*), and Friday queries live database counts.
- **Simulation Purge on Command**: Asking Friday (*"Friday, please purge simulation history"*) coordinates with EDITH over the Inter-Brain Bus, cleans test records, and reports exact counts.
- **Independent Commercial Refusal**: If an operator instructs Friday to delete a lead who is actively marked as **Hot** or in stage `PURCHASE_INTENT`, EDITH autonomously exercises refusal rights, warning that deleting an active qualified deal risks revenue loss and directing the operator to confirm manually in the dashboard.

---

## Consequences
- **Storage Hygiene**: Operators can maintain lean, performant databases without manual SQLite CLI interventions.
- **Full Transparency**: Both live client threads and personal testing threads remain organized, search-indexed, and easily manageable.
- **Safety First**: Accidental pipeline loss is prevented through multi-tiered AI verification and explicit UI confirmations.
