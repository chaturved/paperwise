class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(message, "UNAUTHORIZED", 401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, "FORBIDDEN", 403)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, "CONFLICT", 409)


class BadRequestError(AppError):
    def __init__(self, message: str = "Bad request"):
        super().__init__(message, "BAD_REQUEST", 400)


class UnprocessableEntityError(AppError):
    def __init__(self, message: str = "Unprocessable entity"):
        super().__init__(message, "UNPROCESSABLE_ENTITY", 422)


class PlanLimitError(AppError):
    def __init__(self, limit: str, message: str = "Plan limit exceeded"):
        super().__init__(message, "LIMIT_EXCEEDED", 402)
        self.limit = limit

