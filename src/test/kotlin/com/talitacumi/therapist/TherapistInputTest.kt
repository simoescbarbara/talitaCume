package com.talitacumi.therapist

import com.talitacumi.common.InvalidRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class TherapistInputTest {

    @Test
    fun `crp accepts the usual ways of writing it`() {
        assertEquals("06/123456", TherapistInput.crp("CRP 06/123456"))
        assertEquals("06/123456", TherapistInput.crp("06/123456"))
        assertEquals("06/123456", TherapistInput.crp("06123456"))
        assertEquals("04/12345", TherapistInput.crp("crp-04/12345"))
    }

    @Test
    fun `crp rejects unknown regions and malformed numbers`() {
        assertThrows<InvalidRequestException> { TherapistInput.crp("25/123456") }
        assertThrows<InvalidRequestException> { TherapistInput.crp("00/123456") }
        assertThrows<InvalidRequestException> { TherapistInput.crp("06/12") }
        assertThrows<InvalidRequestException> { TherapistInput.crp("psicóloga") }
    }

    @Test
    fun `topics are deduplicated and limited`() {
        assertEquals(listOf(Topic.ANXIETY, Topic.GRIEF), TherapistInput.topics(listOf(Topic.ANXIETY, Topic.GRIEF, Topic.ANXIETY)))
        assertThrows<InvalidRequestException> { TherapistInput.topics(emptyList()) }
        assertThrows<InvalidRequestException> { TherapistInput.topics(Topic.entries.take(7)) }
    }

    @Test
    fun `a therapist who does both serves either request`() {
        assertTrue(Modality.BOTH.serves(Modality.ONLINE))
        assertTrue(Modality.ONLINE.serves(Modality.ONLINE))
        assertFalse(Modality.IN_PERSON.serves(Modality.ONLINE))
    }

    @Test
    fun `topics survive the round trip through the column`() {
        val converter = TopicsConverter()
        val topics = listOf(Topic.FAITH_CRISIS, Topic.MOTHERHOOD)
        assertEquals(topics, converter.convertToEntityAttribute(converter.convertToDatabaseColumn(topics)))
    }
}
