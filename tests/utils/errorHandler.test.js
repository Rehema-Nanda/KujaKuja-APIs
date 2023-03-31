const {
    InsufficientPermissionsError,
    InternalServerError,
    InvalidParamsError,
    ResourceNotFoundError,
    errorHandler,
} = require("../../src/utils/errorHandler");

describe("#ErrorHandler", () => {
    const res = {
        json: jest.fn(),
        status() {
            return this;
        },
    };

    it("should display error message if InsufficientPermissionsError is called", () => {
        expect(() => {
            throw new InsufficientPermissionsError();
        }).toThrowError("Insufficient permissions");
    });

    it("should display default error message if InternalServerError is called", () => {
        const expectedErrorResponse = {
            error: {
                message: "Something went wrong",
                source: undefined,
            },
        };

        try {
            throw new InternalServerError();
        }
        catch (error) {
            errorHandler(error, res);
        }

        expect(res.json).toHaveBeenCalledWith(expectedErrorResponse);
    });

    it("should display default error message if InvalidParamsError is called", () => {
        const expectedErrorResponse = {
            error: {
                message: "Invalid parameters provided",
                source: "Update responses",
            },
        };

        try {
            throw new InvalidParamsError("Update responses");
        }
        catch (error) {
            errorHandler(error, res);
        }

        expect(res.json).toHaveBeenCalledWith(expectedErrorResponse);
    });

    it("should display default error message if ResourceNotFoundError is called", () => {
        const errorMessage = {
            error: {
                message: "Resource not found",
                source: "Create settlements",
            },
        };

        try {
            throw new ResourceNotFoundError("Create settlements");
        }
        catch (error) {
            errorHandler(error, res);
        }

        expect(res.json).toHaveBeenCalledWith(errorMessage);
    });
});
