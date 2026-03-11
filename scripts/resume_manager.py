import json
import hashlib
import datetime
import os
import sys
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_FILE = os.path.join(BASE_DIR, "metadata", "resume_index.json")
GENERATED_DIR = os.path.join(BASE_DIR, "latex", "generated")
SENT_DIR = os.path.join(BASE_DIR, "latex", "sent")


def base36_hash(text, length=3):
    h = hashlib.md5(text.lower().encode()).hexdigest()
    num = int(h[:8], 16)
    code = base36(num).upper()
    return code[:length]


def base36(num):
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    result = ""
    while num > 0:
        num, rem = divmod(num, 36)
        result = chars[rem] + result
    return result or "0"


def load_index():
    if not os.path.exists(INDEX_FILE):
        return []

    with open(INDEX_FILE, "r") as f:
        data = json.load(f)

    # Handle legacy single-object format
    if isinstance(data, dict):
        return [data]

    return data


def save_index(data):
    os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
    with open(INDEX_FILE, "w") as f:
        json.dump(data, f, indent=2)


def generate_code(job_title, location):
    title_code = base36_hash(job_title)
    loc_code = base36_hash(location)

    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M")

    return f"{title_code}{loc_code}{timestamp}", title_code, loc_code


def get_latest_resume(title_code):
    index = load_index()

    matches = [
        r for r in index
        if r["title_code"] == title_code
    ]

    if not matches:
        return None

    matches.sort(key=lambda x: x["timestamp"], reverse=True)

    return matches[0]


def store_resume(code, title_code, location_code, job_title, location, company):
    index = load_index()

    record = {
        "code": code,
        "title_code": title_code,
        "location_code": location_code,
        "job_title": job_title,
        "location": location,
        "company": company,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "pdf": f"generated/{code}.pdf",
        "status": "generated"
    }

    index.append(record)

    save_index(index)

    return record


def send_resume(code):
    """Copy generated PDF to sent/ as Kaushik-Shahare.pdf for professional use."""
    index = load_index()

    match = next((r for r in index if r["code"] == code), None)
    if not match:
        return {"error": f"Resume code '{code}' not found in index"}

    src = os.path.join(GENERATED_DIR, f"{code}.pdf")
    if not os.path.exists(src):
        return {"error": f"PDF not found at {src}"}

    os.makedirs(SENT_DIR, exist_ok=True)
    dst = os.path.join(SENT_DIR, "Kaushik-Shahare.pdf")
    shutil.copy2(src, dst)

    # Also keep a copy with the code for reference
    shutil.copy2(src, os.path.join(SENT_DIR, f"{code}.pdf"))

    # Update status in index
    for r in index:
        if r["code"] == code:
            r["status"] = "sent"
            r["sent_at"] = datetime.datetime.utcnow().isoformat()
            break

    save_index(index)

    return {"sent": dst, "code": code, "status": "sent"}


def search_resumes(query):
    """Search resumes by job title, company, code, or location."""
    index = load_index()
    query_lower = query.lower()

    results = [
        r for r in index
        if query_lower in r.get("job_title", "").lower()
        or query_lower in r.get("company", "").lower()
        or query_lower in r.get("code", "").lower()
        or query_lower in r.get("location", "").lower()
    ]

    return results


def list_resumes():
    """List all stored resumes."""
    return load_index()


if __name__ == "__main__":

    if len(sys.argv) < 2:
        print("Usage: resume_manager.py <action> [args...]")
        print("Actions: generate, store, send, search, list, latest")
        sys.exit(1)

    action = sys.argv[1]

    if action == "generate":

        job_title = sys.argv[2]
        location = sys.argv[3]

        code, title_code, loc_code = generate_code(job_title, location)

        latest = get_latest_resume(title_code)

        result = {
            "code": code,
            "title_code": title_code,
            "location_code": loc_code,
            "latest_resume": latest
        }

        print(json.dumps(result))

    elif action == "store":

        code = sys.argv[2]
        title_code = sys.argv[3]
        loc_code = sys.argv[4] if len(sys.argv) > 4 else ""
        job_title = sys.argv[5] if len(sys.argv) > 5 else ""
        location = sys.argv[6] if len(sys.argv) > 6 else ""
        company = sys.argv[7] if len(sys.argv) > 7 else ""

        record = store_resume(code, title_code, loc_code, job_title, location, company)

        print(json.dumps(record))

    elif action == "send":

        code = sys.argv[2]
        result = send_resume(code)
        print(json.dumps(result))

    elif action == "search":

        query = sys.argv[2]
        results = search_resumes(query)
        print(json.dumps(results, indent=2))

    elif action == "list":

        results = list_resumes()
        print(json.dumps(results, indent=2))

    elif action == "latest":

        title_code = sys.argv[2]
        result = get_latest_resume(title_code)
        print(json.dumps(result) if result else json.dumps({"message": "No resume found"}))

    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
