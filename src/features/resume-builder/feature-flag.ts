/**
 * New multi-resume AI builder. Off by default so production keeps the classic
 * page until the 20261120000001 migration is applied (see .env.example).
 */
export const RESUME_BUILDER_V2_ENABLED = import.meta.env.VITE_RESUME_BUILDER_V2 === "true";
