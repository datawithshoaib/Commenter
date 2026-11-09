"""Application errors rendered as a consistent JSON envelope."""


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code

    def to_dict(self) -> dict:
        return {"error": {"code": self.code, "message": self.message}}


class ExtractionError(AppError):
    status_code = 422
    code = "extraction_failed"


class LLMConfigError(AppError):
    status_code = 503
    code = "llm_not_configured"


class LLMError(AppError):
    status_code = 502
    code = "llm_error"
