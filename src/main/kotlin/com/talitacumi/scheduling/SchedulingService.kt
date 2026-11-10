package com.talitacumi.scheduling

import com.talitacumi.account.AccountRepository
import com.talitacumi.account.Caller
import com.talitacumi.account.Role
import com.talitacumi.common.InvalidRequestException
import com.talitacumi.common.NotFoundException
import com.talitacumi.common.SlotUnavailableException
import com.talitacumi.therapist.Therapist
import com.talitacumi.therapist.TherapistRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

interface AvailabilityRuleRepository : JpaRepository<AvailabilityRule, UUID> {
    fun findByTherapistId(therapistId: UUID): List<AvailabilityRule>
    fun deleteByTherapistId(therapistId: UUID)
}

interface AppointmentRepository : JpaRepository<Appointment, UUID> {
    @Query(
        "select a from Appointment a where a.therapistId = :tid and a.status = :status " +
            "and a.startsAt < :to and a.endsAt > :from",
    )
    fun findOverlapping(
        @Param("tid") therapistId: UUID,
        @Param("status") status: AppointmentStatus,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<Appointment>

    fun findByClientIdAndEndsAtAfterOrderByStartsAt(clientId: UUID, after: Instant): List<Appointment>
    fun findByTherapistIdAndEndsAtAfterOrderByStartsAt(therapistId: UUID, after: Instant): List<Appointment>
}

@Service
class SlotService(
    private val rules: AvailabilityRuleRepository,
    private val appointments: AppointmentRepository,
    private val therapists: TherapistRepository,
    @Value("\${app.timezone}") timezone: String,
) {
    val zone: ZoneId = ZoneId.of(timezone)

    @Transactional(readOnly = true)
    fun freeSlots(therapistId: UUID, date: LocalDate, now: Instant = Instant.now()): List<Slot> {
        val therapist = therapists.findById(therapistId).filter { it.verified }
            .orElseThrow { NotFoundException("Therapist $therapistId not found") }
        val dayStart = date.atStartOfDay(zone).toInstant()
        val dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant()
        val busy = appointments.findOverlapping(therapistId, AppointmentStatus.CONFIRMED, dayStart, dayEnd)
        return SlotCalculator.generate(rules.findByTherapistId(therapistId), therapist.sessionMinutes, date, zone, busy, now)
    }
}

data class BookAppointment(
    val therapistId: UUID,
    val clientId: UUID,
    val startsAt: Instant,
    val note: String? = null,
    val wantsFaith: Boolean = false,
)

/** One appointment as seen by one of its two participants. The client's contact goes only to her therapist. */
data class AppointmentView(
    val appointment: Appointment,
    val therapistName: String,
    val modality: String,
    val client: ClientContact?,
)

data class ClientContact(val name: String, val email: String, val phone: String)

@Service
class SchedulingService(
    private val therapists: TherapistRepository,
    private val accounts: AccountRepository,
    private val rules: AvailabilityRuleRepository,
    private val appointments: AppointmentRepository,
    private val slots: SlotService,
) {
    @Transactional(readOnly = true)
    fun availability(therapistId: UUID): List<AvailabilityRule> =
        rules.findByTherapistId(therapistId).sortedWith(compareBy({ it.dayOfWeek }, { it.startTime }))

    /** An empty list is allowed: it pauses new bookings without touching existing ones. */
    @Transactional
    fun replaceAvailability(therapistId: UUID, newRules: List<AvailabilityRule>): List<AvailabilityRule> {
        requireTherapist(therapistId)
        newRules.groupBy { it.dayOfWeek }.values.forEach { day ->
            day.sortedBy { it.startTime }.zipWithNext().forEach { (a, b) ->
                if (b.startTime < a.endTime) throw InvalidRequestException("availability windows on ${a.dayOfWeek} overlap")
            }
        }
        rules.deleteByTherapistId(therapistId)
        rules.flush()
        rules.saveAll(newRules)
        return availability(therapistId)
    }

    /**
     * Two layers of protection: the slot check gives a friendly error in the common case,
     * and the database exclusion constraint settles true races between concurrent requests.
     * A violation surfaces as DataIntegrityViolationException and maps to HTTP 409.
     */
    @Transactional
    fun book(command: BookAppointment): Appointment {
        val date = command.startsAt.atZone(slots.zone).toLocalDate()
        val slot = slots.freeSlots(command.therapistId, date)
            .firstOrNull { it.startsAt == command.startsAt }
            ?: throw SlotUnavailableException()
        return appointments.saveAndFlush(
            Appointment(
                therapistId = command.therapistId,
                clientId = command.clientId,
                startsAt = slot.startsAt,
                endsAt = slot.endsAt,
                note = command.note?.trim()?.ifBlank { null },
                wantsFaith = command.wantsFaith,
            ),
        )
    }

    /** Upcoming appointments plus the last week's, so a just-finished session doesn't vanish. */
    @Transactional(readOnly = true)
    fun mine(caller: Caller, now: Instant = Instant.now()): List<AppointmentView> {
        val since = now.minus(Duration.ofDays(7))
        val list = when (caller.role) {
            Role.CLIENT -> appointments.findByClientIdAndEndsAtAfterOrderByStartsAt(caller.id, since)
            Role.THERAPIST -> appointments.findByTherapistIdAndEndsAtAfterOrderByStartsAt(caller.id, since)
        }
        val people = accounts.findAllById(list.flatMap { listOf(it.therapistId, it.clientId) }.toSet()).associateBy { it.id }
        val profiles = therapists.findAllById(list.map { it.therapistId }.toSet()).associateBy(Therapist::accountId)
        return list.map { a ->
            val client = people[a.clientId]
            AppointmentView(
                appointment = a,
                therapistName = people[a.therapistId]?.name.orEmpty(),
                modality = profiles[a.therapistId]?.modality?.name.orEmpty(),
                client = if (caller.role == Role.THERAPIST && client != null) ClientContact(client.name, client.email, client.phone) else null,
            )
        }
    }

    /** Either participant may cancel, until the session starts. Others get a 404, so ids can't be probed. */
    @Transactional
    fun cancel(caller: Caller, appointmentId: UUID, now: Instant = Instant.now()): Appointment {
        val appointment = appointments.findById(appointmentId)
            .filter { it.clientId == caller.id || it.therapistId == caller.id }
            .orElseThrow { NotFoundException("Appointment $appointmentId not found") }
        if (!appointment.startsAt.isAfter(now)) throw InvalidRequestException("a session that has started can't be cancelled")
        appointment.status = AppointmentStatus.CANCELLED
        return appointment
    }

    private fun requireTherapist(id: UUID) {
        if (!therapists.existsById(id)) throw NotFoundException("Therapist $id not found")
    }
}
