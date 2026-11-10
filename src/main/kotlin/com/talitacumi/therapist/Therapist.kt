package com.talitacumi.therapist

import com.talitacumi.common.InvalidRequestException
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Convert
import jakarta.persistence.Converter
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** What a therapist helps with. The web app owns the Portuguese labels (`web/src/lib/copy.ts`). */
enum class Topic {
    ANXIETY,
    DEPRESSION,
    GRIEF,
    SELF_ESTEEM,
    RELATIONSHIPS,
    MARRIAGE,
    FAMILY,
    MOTHERHOOD,
    TRAUMA,
    DOMESTIC_VIOLENCE,
    BURNOUT,
    FAITH_CRISIS,
}

enum class Modality {
    ONLINE,
    IN_PERSON,
    BOTH,
    ;

    /** Someone asking for online sessions is also served by a therapist who does both. */
    fun serves(wanted: Modality): Boolean = this == wanted || this == BOTH || wanted == BOTH
}

@Converter
class TopicsConverter : AttributeConverter<List<Topic>, String> {
    override fun convertToDatabaseColumn(topics: List<Topic>): String = topics.joinToString(",") { it.name }

    override fun convertToEntityAttribute(column: String): List<Topic> =
        column.split(",").filter { it.isNotBlank() }.map { Topic.valueOf(it) }
}

/**
 * A psychologist's public profile; the person is the [com.talitacumi.account.Account] with the same id.
 * Stays out of search until [verifiedAt] is set, after someone checks the CRP in the Conselho's public registry.
 */
@Entity
@Table(name = "therapist")
class Therapist(
    @Id val accountId: UUID,
    /** Changing it would need a new verification, so it is set once at sign-up. */
    val crp: String,
    var approach: String,
    var bio: String,
    var faithNote: String? = null,
    @Convert(converter = TopicsConverter::class) var topics: List<Topic>,
    var city: String,
    @Enumerated(EnumType.STRING) var modality: Modality,
    var sessionMinutes: Int = 50,
    var priceCents: Int? = null,
    var verifiedAt: Instant? = null,
    val createdAt: Instant = Instant.now(),
) {
    val verified: Boolean get() = verifiedAt != null
}

object TherapistInput {
    // There are 24 regional councils (01 to 24); registration numbers have up to 6 digits.
    private val CRP = Regex("^(?:CRP)?(\\d{2})/?(\\d{3,6})$")

    /** Accepts "CRP 06/123456", "06/123456" or "06123456"; stores "06/123456". */
    fun crp(raw: String): String {
        val compact = raw.uppercase().filter { it.isLetterOrDigit() || it == '/' }
        val match = CRP.matchEntire(compact) ?: throw InvalidRequestException("crp must look like 06/123456")
        val (region, number) = match.destructured
        if (region.toInt() !in 1..24) throw InvalidRequestException("crp region must be between 01 and 24")
        return "$region/$number"
    }

    fun topics(raw: List<Topic>): List<Topic> {
        val topics = raw.distinct()
        if (topics.isEmpty()) throw InvalidRequestException("choose at least one topic")
        if (topics.size > 6) throw InvalidRequestException("choose at most 6 topics")
        return topics
    }
}
