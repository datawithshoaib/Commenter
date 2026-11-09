import pytest

from app.core.errors import ExtractionError
from app.extractors.base import clean_text, detect_platform
from app.extractors.generic import parse_generic_html
from app.extractors.linkedin import linkedin_urn, parse_linkedin_html
from app.extractors.x import parse_status_url, syndication_token


@pytest.mark.parametrize(
    ("url", "platform"),
    [
        ("https://www.linkedin.com/posts/someone_activity-7369432203736305666-Nf9O", "linkedin"),
        ("https://lnkd.in/abc123", "linkedin"),
        ("https://x.com/jack/status/20", "x"),
        ("https://mobile.twitter.com/jack/status/20", "x"),
        ("https://example.com/blog/post", "other"),
        ("https://notlinkedin.com/posts/x", "other"),
    ],
)
def test_detect_platform(url, platform):
    assert detect_platform(url) == platform


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://x.com/jack/status/20", ("jack", "20")),
        ("https://twitter.com/i/web/status/1234567890", (None, "1234567890")),
        ("https://x.com/user/status/1790000000000000000?s=20", ("user", "1790000000000000000")),
    ],
)
def test_parse_status_url(url, expected):
    assert parse_status_url(url) == expected


def test_parse_status_url_rejects_profiles():
    with pytest.raises(ExtractionError):
        parse_status_url("https://x.com/jack")


def test_syndication_token_matches_widget_algorithm():
    # Known value from the X embed widget for tweet id 20
    assert syndication_token("20") == "6dq"


@pytest.mark.parametrize(
    ("url", "urn"),
    [
        ("https://www.linkedin.com/posts/a_b-activity-7369432203736305666-Nf9O", "urn:li:activity:7369432203736305666"),
        ("https://www.linkedin.com/feed/update/urn:li:share:7140376237780131840/", "urn:li:share:7140376237780131840"),
        ("https://www.linkedin.com/in/someone", None),
    ],
)
def test_linkedin_urn(url, urn):
    assert linkedin_urn(url) == urn


LINKEDIN_HTML = """
<html><head>
<meta property="og:title" content="Big news | Jane Doe posted on the topic | LinkedIn">
<meta property="og:url" content="https://www.linkedin.com/posts/jane_activity-1">
</head><body>
<a data-tracking-control-name="public_post_feed-actor-name" href="https://www.linkedin.com/in/janedoe?trk=x">Jane Doe</a>
<p class="attributed-text-segment-list__content" data-test-id="main-feed-activity-card__commentary">
Shipping beats perfect.<br><br>We launched&nbsp;today.</p>
<section class="comments"><p class="attributed-text-segment-list__content">A comment</p></section>
</body></html>
"""


def test_parse_linkedin_post():
    post = parse_linkedin_html(LINKEDIN_HTML)
    assert post is not None
    assert post.text == "Shipping beats perfect.\n\nWe launched today."
    assert post.author == "Jane Doe"
    assert post.author_handle == "janedoe"
    assert post.platform == "linkedin"


def test_parse_linkedin_ignores_comments_when_post_has_no_caption():
    html = """<html><head>
    <meta property="og:description" content="Remembering my father | 3,311 comments on LinkedIn">
    </head><body><div class="comment-item"><p class="attributed-text-segment-list__content">Not the post</p></div>
    </body></html>"""
    post = parse_linkedin_html(html)
    assert post is not None
    assert post.text == "Remembering my father"


def test_parse_generic_prefers_json_ld():
    html = """<html><head><script type="application/ld+json">
    {"@type": "BlogPosting", "articleBody": "This is a long enough article body to be used.", "author": {"name": "Ann"}}
    </script></head><body><p>ignored</p></body></html>"""
    post = parse_generic_html(html, "https://example.com/a")
    assert post.text == "This is a long enough article body to be used."
    assert post.author == "Ann"


def test_clean_text_normalizes_whitespace():
    assert clean_text("a\xa0 b\r\n\n\n\nc  ") == "a b\n\nc"
