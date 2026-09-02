"""
Interactive WhatsApp CLI Client for WB-Agent.
Connects directly to the live running backend as any WhatsApp phone number.
"""

import argparse
import json
import sys
import httpx

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://localhost:8000"


def send_message(phone: str, text: str):
    clean_phone = "".join(filter(str.isdigit, phone))
    url = f"{BASE_URL}/api/v1/webhooks/whatsapp"
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": clean_phone,
                                    "id": f"wamid_cli_{clean_phone}",
                                    "timestamp": "1725300200",
                                    "type": "text",
                                    "text": {"body": text},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    resp = httpx.post(url, json=payload, timeout=10.0)
    return resp.json()


def get_conversation_for_phone(phone: str):
    clean_phone = "+" + "".join(filter(str.isdigit, phone))
    convs_resp = httpx.get(f"{BASE_URL}/api/v1/conversations?limit=50", timeout=10.0).json()
    for item in convs_resp.get("items", []):
        if item.get("channel_id") == clean_phone:
            details = httpx.get(f"{BASE_URL}/api/v1/conversations/{item['id']}", timeout=10.0).json()
            return item, details
    return None, None


def main():
    parser = argparse.ArgumentParser(description="WB-Agent WhatsApp Interactive Client")
    parser.add_argument("--phone", default="+918918753100", help="WhatsApp phone number")
    parser.add_argument("--message", help="Single message to send")
    args = parser.parse_args()

    phone = args.phone
    print("=" * 80)
    print(f"[*] WB-AGENT WHATSAPP CLIENT: Connected with {phone}")
    print(f"[*] Operator Dashboard: http://localhost:3000/conversations")
    print("=" * 80)

    if args.message:
        print(f"\n[YOU ({phone})]: {args.message}")
        send_message(phone, args.message)
        conv, details = get_conversation_for_phone(phone)
        if details and details.get("messages"):
            latest = details["messages"][-1]
            sender = latest.get("sender_type", "agent").upper()
            content = latest.get("content", "")
            print(f"[{sender}]: {content}")
            print(f"--> Stage: {conv.get('sales_stage')} | Lead Score: {conv.get('lead_score')}/100")
        return

    # Interactive Loop
    conv, details = get_conversation_for_phone(phone)
    if details and details.get("messages"):
        print(f"\n--- Previous Conversation History ({len(details['messages'])} messages) ---")
        for m in details["messages"]:
            print(f"[{m.get('sender_type', '').upper()}]: {m.get('content')}")
        print("-" * 60)

    print("\nType your message below and press Enter (or 'exit' to quit):\n")
    while True:
        try:
            user_input = input(f"[{phone}] > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                print("[*] Exiting client.")
                break

            send_message(phone, user_input)
            conv, details = get_conversation_for_phone(phone)
            if details and details.get("messages"):
                latest = details["messages"][-1]
                sender = latest.get("sender_type", "agent").upper()
                content = latest.get("content", "")
                print(f"\n[{sender}]: {content}")
                print(f"--> Stage: {conv.get('sales_stage')} | Lead Score: {conv.get('lead_score')}/100\n")

        except (KeyboardInterrupt, EOFError):
            print("\n[*] Exited.")
            break


if __name__ == "__main__":
    main()
