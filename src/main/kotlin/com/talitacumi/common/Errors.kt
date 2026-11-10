package com.talitacumi.common

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

class NotFoundException(message: String) : RuntimeException(message)

class SlotUnavailableException : RuntimeException("This time is no longer available")

class InvalidRequestException(message: String) : RuntimeException(message)

class ConflictException(message: String) : RuntimeException(message)

class UnauthorizedException(message: String) : RuntimeException(message)

class ForbiddenException(message: String) : RuntimeException(message)

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException::class)
    fun notFound(e: NotFoundException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.message ?: "Not found")

    @ExceptionHandler(InvalidRequestException::class)
    fun invalid(e: InvalidRequestException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.message ?: "Invalid request")

    @ExceptionHandler(UnauthorizedException::class)
    fun unauthorized(e: UnauthorizedException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.message ?: "Unauthorized")

    @ExceptionHandler(ForbiddenException::class)
    fun forbidden(e: ForbiddenException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, e.message ?: "Forbidden")

    @ExceptionHandler(ConflictException::class)
    fun conflict(e: ConflictException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.message ?: "Conflict")

    @ExceptionHandler(SlotUnavailableException::class)
    fun slotTaken(e: SlotUnavailableException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.message ?: "Conflict")

    /** Constraints fire when two requests race: for the same time, or to sign up with the same e-mail or CRP. */
    @ExceptionHandler(DataIntegrityViolationException::class)
    fun integrity(e: DataIntegrityViolationException): ProblemDetail {
        val cause = e.mostSpecificCause.message.orEmpty()
        val detail = when {
            "no_overlapping_appointments" in cause -> "This time is no longer available"
            "account_email_uq" in cause -> "This e-mail is already registered"
            "therapist_crp_uq" in cause -> "This CRP is already registered"
            else -> "The request conflicts with existing data"
        }
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail)
    }
}
