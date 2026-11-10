package com.talitacumi.scheduling

import com.talitacumi.account.CurrentAccount
import com.talitacumi.account.Role
import com.talitacumi.common.InvalidRequestException
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

data class AvailabilityRuleRequest(
    @field:NotNull val dayOfWeek: DayOfWeek?,
    @field:NotNull val startTime: LocalTime?,
    @field:NotNull val endTime: LocalTime?,
)

data class SetAvailabilityRequest(
    @field:Valid @field:NotNull @field:Size(max = 50) val rules: List<AvailabilityRuleRequest>?,
)

data class AvailabilityRuleResponse(val dayOfWeek: DayOfWeek, val startTime: LocalTime, val endTime: LocalTime)

data class BookAppointmentRequest(
    @field:NotNull val therapistId: UUID?,
    @field:NotNull val startsAt: Instant?,
    @field:Size(max = 1000) val note: String? = null,
    val wantsFaith: Boolean = false,
)

data class AppointmentResponse(
    val id: UUID,
    val therapistId: UUID,
    val therapistName: String,
    val modality: String,
    val startsAt: Instant,
    val endsAt: Instant,
    val status: AppointmentStatus,
    val note: String?,
    val wantsFaith: Boolean,
    /** Only in the therapist's view, so she can reach the client (e.g. to send the video link). */
    val client: ClientContact?,
)

fun AppointmentView.toResponse() = AppointmentResponse(
    appointment.id, appointment.therapistId, therapistName, modality, appointment.startsAt, appointment.endsAt,
    appointment.status, appointment.note, appointment.wantsFaith, client,
)

@RestController
@RequestMapping("/api")
class SchedulingController(
    private val scheduling: SchedulingService,
    private val slots: SlotService,
    private val current: CurrentAccount,
) {
    @GetMapping("/therapists/me/availability")
    fun availability(request: HttpServletRequest): List<AvailabilityRuleResponse> =
        scheduling.availability(current.require(request, Role.THERAPIST).id).map { it.toResponse() }

    @PutMapping("/therapists/me/availability")
    fun setAvailability(request: HttpServletRequest, @Valid @RequestBody body: SetAvailabilityRequest): List<AvailabilityRuleResponse> {
        val therapistId = current.require(request, Role.THERAPIST).id
        val rules = body.rules!!.map {
            if (!it.endTime!!.isAfter(it.startTime!!)) throw InvalidRequestException("endTime must be after startTime")
            AvailabilityRule(therapistId = therapistId, dayOfWeek = it.dayOfWeek!!, startTime = it.startTime, endTime = it.endTime)
        }
        return scheduling.replaceAvailability(therapistId, rules).map { it.toResponse() }
    }

    @GetMapping("/therapists/{id}/slots")
    fun freeSlots(
        @PathVariable id: UUID,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate,
    ): List<Slot> = slots.freeSlots(id, date)

    /** Only signed-in clients book, so every appointment belongs to an account she controls. */
    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    fun book(request: HttpServletRequest, @Valid @RequestBody body: BookAppointmentRequest): AppointmentResponse {
        val client = current.require(request, Role.CLIENT)
        val appointment = scheduling.book(
            BookAppointment(
                therapistId = body.therapistId!!,
                clientId = client.id,
                startsAt = body.startsAt!!,
                note = body.note,
                wantsFaith = body.wantsFaith,
            ),
        )
        return scheduling.mine(client).first { it.appointment.id == appointment.id }.toResponse()
    }

    @GetMapping("/appointments/me")
    fun mine(request: HttpServletRequest): List<AppointmentResponse> =
        scheduling.mine(current.require(request)).map { it.toResponse() }

    @PatchMapping("/appointments/{id}/cancel")
    fun cancel(request: HttpServletRequest, @PathVariable id: UUID): AppointmentResponse {
        val caller = current.require(request)
        scheduling.cancel(caller, id)
        return scheduling.mine(caller).first { it.appointment.id == id }.toResponse()
    }
}

private fun AvailabilityRule.toResponse() = AvailabilityRuleResponse(dayOfWeek, startTime, endTime)
