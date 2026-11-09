from app.chains.postprocess import X_CHAR_LIMIT, clean_comment, fit_to_limit


def test_strips_quotes_label_hashtags_and_emojis():
    raw = 'Comment: "Async work wins 🚀 #remote #work"'
    assert clean_comment(raw, platform="linkedin", use_emojis=False) == "Async work wins"


def test_keeps_emojis_when_allowed():
    assert "🚀" in clean_comment("Async wins 🚀", platform="linkedin", use_emojis=True)


def test_replaces_em_dashes():
    assert clean_comment("Fast — and right", platform="linkedin", use_emojis=True) == "Fast, and right"


def test_x_limit_enforced():
    long = "This is a sentence. " * 30
    result = clean_comment(long, platform="x", use_emojis=False)
    assert len(result) <= X_CHAR_LIMIT
    assert result.endswith(".")


def test_fit_to_limit_word_boundary():
    text = "word " * 100
    result = fit_to_limit(text.strip(), 50)
    assert len(result) <= 50
    assert result.endswith("…")
