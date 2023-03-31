// eslint-disable-next-line max-classes-per-file
const debug = require("debug")("errorHandler");
const httpStatus = require("http-status");
const logger = require("../config/logging");

class BaseError extends Error {
    constructor(source, message, status) {
        super(message);
        this.source = source;
        this.status = status;
    }
}

class InternalServerError extends BaseError {
    constructor(source, message) {
        const errorMessage = message || "Something went wrong";
        super(source, errorMessage, httpStatus.INTERNAL_SERVER_ERROR);
    }
}

class InvalidParamsError extends BaseError {
    constructor(source, message) {
        const errorMessage = message || "Invalid parameters provided";
        super(source, errorMessage, httpStatus.BAD_REQUEST);
    }
}

class ResourceNotFoundError extends BaseError {
    constructor(source, message) {
        const errorMessage = message || "Resource not found";
        super(source, errorMessage, httpStatus.NOT_FOUND);
    }
}

class InsufficientPermissionsError extends BaseError {
    constructor(source, message) {
        const errorMessage = message || "Insufficient permissions";
        super(source, errorMessage, httpStatus.UNAUTHORIZED);
    }
}

const errorHandler = (error, res, req) => {
    debug(error);
    if (req && req.log) {
        req.log.error(error);
    } else {
        logger.error(error);
    }

    if (error instanceof BaseError) {
        return res.status(error.status).json({ error: { message: error.message, source: error.source } });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: "INTERNAL SERVER ERROR" });
};

module.exports = {
    InternalServerError,
    InvalidParamsError,
    ResourceNotFoundError,
    InsufficientPermissionsError,
    errorHandler,
};
