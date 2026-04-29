import pytest

from analyzer.config import GEMINI_BASE_URL, Settings


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    for key in (
        "OPENAI_API_KEY",
        "OPENAI_MODEL",
        "OPENAI_BASE_URL",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GEMINI_MODEL",
        "GEMINI_BASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    yield


def test_no_keys_means_no_llm():
    s = Settings.from_env()
    assert s.llm_provider == "none"
    assert not s.has_llm


def test_openai_key_takes_precedence(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-abc")
    monkeypatch.setenv("GEMINI_API_KEY", "AIza-xyz")
    s = Settings.from_env()
    assert s.llm_provider == "openai"
    assert s.llm_api_key == "sk-abc"
    assert s.llm_model == "gpt-4o-mini"
    assert s.llm_base_url is None
    assert s.has_llm


def test_gemini_alone(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "AIza-xyz")
    s = Settings.from_env()
    assert s.llm_provider == "gemini"
    assert s.llm_api_key == "AIza-xyz"
    assert s.llm_model.startswith("gemini-")
    assert s.llm_base_url == GEMINI_BASE_URL


def test_google_api_key_alias(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "AIza-xyz")
    s = Settings.from_env()
    assert s.llm_provider == "gemini"
    assert s.has_llm


def test_custom_model_overrides(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "AIza-xyz")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.0-flash")
    s = Settings.from_env()
    assert s.llm_model == "gemini-2.0-flash"
