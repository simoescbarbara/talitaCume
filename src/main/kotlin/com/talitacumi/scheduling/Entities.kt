package com.talitacumi.scheduling

import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalTime
import java.util.UUID

/** Weekly recurring availability in local time, e.g. MONDAY 08:00-12:00. Sessions are cut from it. */
@Entity
@Table(name = "availability_rule")
class AvailabilityRule(
    @Id val id: UUID = UUID.randomUUID(),
    val therapistId: UUID,
    @Enumerated(EnumType.STRING) val dayOfWeek: DayOfWeek,
    val startTime: LocalTime,
    val endTime: LocalTime,
)

enum class AppointmentStatus { CONFIRMED, CANCELLED }

@Entity
@Table(name = "appointment")
class Appointment(
    @Id val id: UUID = UUID.randomUUID(),
    val therapistId: UUID,
    val clientId: UUID,
    val startsAt: Instant,
    val endsAt: Instant,
    /** What she wants to share before the session, in her own words. Optional and sensitive. */
    val note: String? = null,
    /** She asked for faith to be part of the sessions. */
    val wantsFaith: Boolean = false,
    @Enumerated(EnumType.STRING) var status: AppointmentStatus = AppointmentStatus.CONFIRMED,
    val createdAt: Instant = Instant.now(),
)
