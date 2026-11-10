package com.talitacumi.account

import com.talitacumi.common.InvalidRequestException
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** CLIENT: a woman looking for help. THERAPIST: a psychologist who also has a [com.talitacumi.therapist.Therapist] profile. */
enum class Role { CLIENT, THERAPIST }

/** Someone who signs in. Personal data under LGPD: never log or return [passwordHash]. */
@Entity
@Table(name = "account")
class Account(
    @Id val id: UUID = UUID.randomUUID(),
    var name: String,
    var email: String,
    var phone: String,
    var passwordHash: String,
    @Enumerated(EnumType.STRING) val role: Role,
    val createdAt: Instant = Instant.now(),
)

/** Turns what people type into the stored form, or rejects it. Pure, so it is unit-tested without Spring. */
object AccountInput {
    /** BCrypt ignores everything past 72 bytes, so longer passwords would be silently truncated. */
    const val PASSWORD_MAX_BYTES = 72

    fun email(raw: String): String = raw.trim().lowercase()

    /** Accepts "(11) 98765-4321" or "11987654321"; stores the 10 or 11 digits. */
    fun phone(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        if (digits.length !in 10..11) throw InvalidRequestException("phone must have 10 or 11 digits, including the area code")
        return digits
    }

    fun password(raw: String): String {
        if (raw.toByteArray(Charsets.UTF_8).size > PASSWORD_MAX_BYTES) {
            throw InvalidRequestException("password is too long")
        }
        return raw
    }
}
