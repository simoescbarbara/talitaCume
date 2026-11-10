package com.talitacumi.scheduling

import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

data class Slot(val startsAt: Instant, val endsAt: Instant)

/** Pure function, no Spring and no database: easy to unit test. */
object SlotCalculator {

    /**
     * Sessions start on a half-hour grid and leave the rest of the step as a break:
     * a 50-minute session starts every hour (09:00-09:50, 10:00-10:50), a 90-minute one every 90 minutes.
     */
    fun step(sessionMinutes: Int): Duration = Duration.ofMinutes(((sessionMinutes + 29) / 30 * 30).toLong())

    fun generate(
        rules: List<AvailabilityRule>,
        sessionMinutes: Int,
        date: LocalDate,
        zone: ZoneId,
        busy: List<Appointment>,
        now: Instant,
    ): List<Slot> {
        val step = step(sessionMinutes)
        val length = Duration.ofMinutes(sessionMinutes.toLong())
        return rules.filter { it.dayOfWeek == date.dayOfWeek }
            .flatMap { rule ->
                val end = date.atTime(rule.endTime).atZone(zone).toInstant()
                val slots = mutableListOf<Slot>()
                var cursor = date.atTime(rule.startTime).atZone(zone).toInstant()
                while (!cursor.plus(length).isAfter(end)) {
                    slots += Slot(cursor, cursor.plus(length))
                    cursor = cursor.plus(step)
                }
                slots
            }
            .filter { it.startsAt.isAfter(now) }
            .filter { slot -> busy.none { it.startsAt < slot.endsAt && it.endsAt > slot.startsAt } }
            .sortedBy { it.startsAt }
    }
}
