// error/ApiError.js (исправление: badRequest возвращает 400, не 404)
class ApiError extends Error {
  constructor(status, message) {
    super();
    this.status = status;
    this.message = message;
  }
  static badRequest(message) {
    return new ApiError(400, message); // ← Изменено на 400 (Bad Request) для валидации
  }
  static internal(message) {
    return new ApiError(500, message);
  }
  static forbidden(message) {
    return new ApiError(403, message);
  }
}
module.exports = ApiError;