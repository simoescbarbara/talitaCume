package com.talitacumi.scheduling

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

class SlotCalculatorTest {
    private val zone = ZoneId.of("America/Sao_Paulo")
    private val therapist = UUID.randomUUID()
    private val monday = LocalDate.of(2026, 10, 19) // a Monday
    private val longAgo = Instant.parse("2026-01-01T00:00:00Z")

    private val morning = AvailabilityRule(
        therapistId = therapist,
        dayOfWeek = DayOfWeek.MONDAY,
        startTime = LocalTime.of(8, 0),
        endTime = LocalTime.of(12, 0),
    )

    private fun at(hour: Int, minute: Int = 0) = monday.atTime(hour, minute).atZone(zone).toInstant()

    @Test
    fun `fifty-minute sessions start on the hour and leave a ten-minute break`() {
        val slots = SlotCalculator.generate(listOf(morning), 50, monday, zone, emptyList(), longAgo)
        assertEquals(listOf(at(8), at(9), at(10), at(11)), slots.map { it.startsAt })
        assertEquals(at(8, 50), slots.first().endsAt)
    }

    @Test
    fun `step rounds the session up to the half-hour grid`() {
        assertEquals(Duration.ofMinutes(30), SlotCalculator.step(30))
        assertEquals(Duration.ofMinutes(60), SlotCalculator.step(45))
        assertEquals(Duration.ofMinutes(60), SlotCalculator.step(60))
        assertEquals(Duration.ofMinutes(90), SlotCalculator.step(90))
    }

    @Test
    fun `a session that would run past the window is not offered`() {
        val short = AvailabilityRule(therapistId = therapist, dayOfWeek = DayOfWeek.MONDAY, startTime = LocalTime.of(8, 0), endTime = LocalTime.of(9, 30))
        val slots = SlotCalculator.generate(listOf(short), 90, monday, zone, emptyList(), longAgo)
        assertEquals(listOf(at(8)), slots.map { it.startsAt })
    }

    @Test
    fun `ignores rules for other weekdays`() {
        assertEquals(0, SlotCalculator.generate(listOf(morning), 50, monday.plusDays(1), zone, emptyList(), longAgo).size)
    }

    @Test
    fun `removes slots that overlap a confirmed appointment`() {
        val booked = Appointment(therapistId = therapist, clientId = UUID.randomUUID(), startsAt = at(9), endsAt = at(9, 50))
        val slots = SlotCalculator.generate(listOf(morning), 50, monday, zone, listOf(booked), longAgo)
        assertEquals(listOf(at(8), at(10), at(11)), slots.map { it.startsAt })
    }

    @Test
    fun `drops slots that already started`() {
        val slots = SlotCalculator.generate(listOf(morning), 50, monday, zone, emptyList(), at(9, 30))
        assertEquals(listOf(at(10), at(11)), slots.map { it.startsAt })
    }
}
