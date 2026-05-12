import * as rentalService from "../services/rental.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRentals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "", status = "" } = req.query;

  const result = await rentalService.getRentals({
    page: Number(page),
    limit: Number(limit),
    search,
    status,
  });

  return successResponse(
    res,
    "Rental tracking data fetched successfully",
    200,
    result
  );
});

export const getRentalDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await rentalService.getRentalDetails(id);

  return successResponse(
    res,
    "Rental details fetched successfully",
    200,
    result
  );
});
