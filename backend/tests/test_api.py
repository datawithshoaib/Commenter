import json

from app.core.config import get_settings

POST_TEXT = "We cancelled all recurring meetings for a month. Output went up and stress went down."


def _events(body: str) -> list[tuple[str, object]]:
    events = []
    for block in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


def test_health_and_styles(client):
    assert client.get("/api/health").json()["status"] == "ok"
    data = client.get("/api/styles").json()
    keys = [s["key"] for s in data["styles"]]
    assert len(keys) == 8 and set(data["defaults"]) <= set(keys)
    assert "instructions" not in data["styles"][0]


def test_generate_returns_comments_in_requested_order(client, fake_llm):
    styles = ["insightful", "curious", "supportive"]
    resp = client.post("/api/generate", json={"text": POST_TEXT, "styles": styles, "platform": "linkedin"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert [c["style"] for c in data["comments"]] == styles
    first = data["comments"][0]
    # post-processing: quotes, hashtags and emojis (disabled by default) removed
    assert first["text"] == "Thought Leader take on async work"
    assert first["char_count"] == len(first["text"])
    assert data["analysis"]["topic"] == "Remote work"
    assert data["post"]["source"] == "pasted"


def test_generate_stream_emits_events_in_order(client, fake_llm):
    styles = ["insightful", "supportive", "witty"]
    with client.stream("POST", "/api/generate/stream", json={"text": POST_TEXT, "styles": styles}) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        body = "".join(resp.iter_text())
    events = _events(body)
    names = [name for name, _ in events]
    assert names[:2] == ["post", "analysis"]
    assert names.count("comment") == 3
    assert names[-1] == "done"
    # parallel fan-out: the fast style streams before the slow ones
    streamed = [data["style"] for name, data in events if name == "comment"]
    assert streamed[0] == "witty"
    assert events[0][1]["platform"] == "linkedin"  # auto platform for pasted text


def test_one_failing_style_does_not_sink_the_batch(client, fake_llm):
    fake_llm.fail_styles = {"Wit"}
    resp = client.post("/api/generate", json={"text": POST_TEXT, "styles": ["insightful", "witty"]})
    assert resp.status_code == 200
    assert [c["style"] for c in resp.json()["comments"]] == ["insightful"]


def test_stream_reports_error_when_llm_not_configured(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    from app.core import llm

    llm._build.cache_clear()
    with client.stream("POST", "/api/generate/stream", json={"text": POST_TEXT}) as resp:
        events = _events("".join(resp.iter_text()))
    assert events[-1][0] == "error"
    assert events[-1][1]["code"] == "llm_not_configured"


def test_validation_errors_use_envelope(client):
    resp = client.post("/api/generate", json={"styles": ["insightful"]})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "invalid_request"
    assert "text or a post URL" in resp.json()["error"]["message"]

    resp = client.post("/api/generate", json={"text": "hi", "styles": ["nope"]})
    assert "Unknown style" in resp.json()["error"]["message"]


def test_regenerate_and_refine(client, fake_llm):
    post = {"platform": "x", "text": POST_TEXT}
    resp = client.post("/api/comments/regenerate", json={"post": post, "style": "curious", "avoid": ["old draft"]})
    assert resp.status_code == 200
    comment = resp.json()
    assert comment["style"] == "curious"
    assert fake_llm.calls == ["analyze", "Conversation Starter"]  # analysis computed when not supplied

    resp = client.post("/api/comments/refine", json={"post": post, "comment": comment, "action": "shorter"})
    assert resp.status_code == 200
    assert resp.json()["text"].startswith("Refined: Make it noticeably shorter")
    assert resp.json()["id"] != comment["id"]

    resp = client.post("/api/comments/refine", json={"post": post, "comment": comment, "action": "custom"})
    assert resp.status_code == 422
